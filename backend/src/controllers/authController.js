import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['candidate', 'recruiter'])
    .withMessage('Role must be either candidate or recruiter'),
  body('company')
    .if(body('role').equals('recruiter'))
    .notEmpty()
    .withMessage('Company is required for recruiters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]{10,15}$/)
    .withMessage('Please provide a valid phone number')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, password, name, role = 'candidate', company, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, {
        code: 'EMAIL_EXISTS',
        field: 'email',
        message: 'An account with this email already exists'
      });
    }

    // Create user
    const userData = {
      email,
      password,
      name,
      role,
      ...(phone && { phone })
    };

    if (role === 'recruiter' && company) {
      userData.company = company;
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, 201, {
      user: user.toJSON(),
      token
    }, 'Account created successfully');
  } catch (error) {
    console.error('Registration error:', error);
    errorResponse(res, 500, {
      code: 'REGISTRATION_FAILED',
      message: 'Failed to create account'
    });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    if (!user) {
      return errorResponse(res, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
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

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return errorResponse(res, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, 200, {
      user: user.toJSON(),
      token
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 500, {
      code: 'LOGIN_FAILED',
      message: 'Login failed'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    successResponse(res, 200, {
      user: req.user.toJSON()
    }, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Profile error:', error);
    errorResponse(res, 500, {
      code: 'PROFILE_ERROR',
      message: 'Failed to retrieve profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const allowedUpdates = ['name', 'phone', 'company'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, {
        code: 'NO_UPDATES',
        message: 'No valid fields to update'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    successResponse(res, 200, {
      user: user.toJSON()
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return errorResponse(res, 400, {
        code: 'VALIDATION_ERROR',
        field,
        message: error.errors[field].message
      });
    }
    errorResponse(res, 500, {
      code: 'UPDATE_FAILED',
      message: 'Failed to update profile'
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, {
        code: 'FIELD_REQUIRED',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, {
        code: 'PASSWORD_TOO_SHORT',
        field: 'newPassword',
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 400, {
        code: 'INVALID_CURRENT_PASSWORD',
        field: 'currentPassword',
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    console.error('Password change error:', error);
    errorResponse(res, 500, {
      code: 'PASSWORD_CHANGE_FAILED',
      message: 'Failed to change password'
    });
  }
};