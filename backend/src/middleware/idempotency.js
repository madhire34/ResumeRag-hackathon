import crypto from 'crypto';
import { errorResponse } from '../utils/apiResponse.js';

// In-memory store for idempotency keys (in production, use Redis)
const idempotencyStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, data] of idempotencyStore.entries()) {
    if (now - data.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => idempotencyStore.delete(key));
}, 10 * 60 * 1000);

export const idempotencyMiddleware = (req, res, next) => {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return errorResponse(res, 400, {
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Idempotency-Key header is required for POST requests'
    });
  }

  // Validate idempotency key format (should be a UUID or similar)
  if (!/^[a-zA-Z0-9\-_]{8,128}$/.test(idempotencyKey)) {
    return errorResponse(res, 400, {
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: 'Idempotency key must be 8-128 characters long and contain only alphanumeric characters, hyphens, and underscores'
    });
  }

  // Create a unique key that includes user ID and endpoint
  const userId = req.user?.id || 'anonymous';
  const endpoint = `${req.method}:${req.route?.path || req.path}`;
  const fullKey = `${userId}:${endpoint}:${idempotencyKey}`;

  // Check if we've seen this key before
  if (idempotencyStore.has(fullKey)) {
    const storedData = idempotencyStore.get(fullKey);
    
    // If the request is still processing, return 409
    if (storedData.status === 'processing') {
      return errorResponse(res, 409, {
        code: 'REQUEST_IN_PROGRESS',
        message: 'A request with this idempotency key is currently being processed'
      });
    }
    
    // If completed, return the same response
    return res.status(storedData.statusCode)
      .set(storedData.headers)
      .json(storedData.body);
  }

  // Mark as processing
  idempotencyStore.set(fullKey, {
    status: 'processing',
    timestamp: Date.now()
  });

  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  let statusCode = 200;

  // Override status method to capture status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override send method to capture response
  res.send = function(data) {
    // Store the response
    idempotencyStore.set(fullKey, {
      status: 'completed',
      statusCode,
      headers: {
        'Content-Type': res.get('Content-Type') || 'application/json'
      },
      body: data,
      timestamp: Date.now()
    });

    return originalSend.call(this, data);
  };

  // Override json method to capture response
  res.json = function(data) {
    // Store the response
    idempotencyStore.set(fullKey, {
      status: 'completed',
      statusCode,
      headers: {
        'Content-Type': 'application/json'
      },
      body: data,
      timestamp: Date.now()
    });

    return originalJson.call(this, data);
  };

  // Handle errors - remove processing status
  const cleanup = () => {
    if (idempotencyStore.has(fullKey) && idempotencyStore.get(fullKey).status === 'processing') {
      idempotencyStore.delete(fullKey);
    }
  };

  res.on('error', cleanup);
  res.on('close', () => {
    if (!res.headersSent) {
      cleanup();
    }
  });

  next();
};

export const generateIdempotencyKey = () => {
  return crypto.randomBytes(16).toString('hex');
};