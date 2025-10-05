import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, {
        code: 'AUTH_REQUIRED',
        message: 'Authentication token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('+requestCount +requestWindowStart');
      
      if (!user) {
        return errorResponse(res, 401, {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        });
      }

      if (!user.isActive) {
        return errorResponse(res, 401, {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account has been deactivated'
        });
      }

      if (user.isLocked) {
        return errorResponse(res, 423, {
          code: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked due to failed login attempts'
        });
      }

      // Check rate limiting
      if (user.isRateLimited()) {
        return errorResponse(res, 429, {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Rate limit exceeded.'
        });
      }

      // Increment request count
      await user.incrementRequestCount();

      // Update last activity
      user.lastLogin = new Date();
      await user.save();

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return errorResponse(res, 401, {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return errorResponse(res, 401, {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 500, {
      code: 'AUTH_ERROR',
      message: 'Authentication system error'
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

export const requireRecruiter = requireRole('recruiter', 'admin');
export const requireAdmin = requireRole('admin');

// Alias for backward compatibility
export const authenticateToken = authenticate;

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive && !user.isLocked) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};