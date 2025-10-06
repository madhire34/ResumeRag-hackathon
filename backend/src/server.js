import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middleware
import { idempotencyMiddleware } from './middleware/idempotency.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import askRoutes from './routes/askRoutes.js';

// Import utilities
import { errorResponse } from './utils/apiResponse.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust proxy
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173'];

// Add default production frontend if FRONTEND_URL is not set
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('https://resume-rag-hackathon.vercel.app');
}

console.log('🌐 CORS allowed origins:', allowedOrigins);
console.log('🌍 Environment:', process.env.NODE_ENV);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  credentials: true
}));

// Compression middleware
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Idempotency middleware for POST requests
app.use(idempotencyMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ask', askRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ResumeRAG API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      resumes: '/api/resumes',
      jobs: '/api/jobs',
      ask: '/api/ask'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ResumeRAG API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'POST /api/auth/change-password'
      },
      resumes: {
        upload: 'POST /api/resumes (requires multipart/form-data)',
        list: 'GET /api/resumes?limit=10&offset=0&q=search',
        getById: 'GET /api/resumes/:id'
      },
      jobs: {
        create: 'POST /api/jobs',
        list: 'GET /api/jobs?limit=10&offset=0&q=search',
        getById: 'GET /api/jobs/:id',
        match: 'POST /api/jobs/:id/match'
      },
      ask: {
        query: 'POST /api/ask'
      }
    },
    testUsers: {
      recruiter: {
        email: 'recruiter@resumerag.com',
        password: 'test123',
        role: 'recruiter'
      },
      candidate: {
        email: 'candidate@resumerag.com', 
        password: 'test123',
        role: 'candidate'
      },
      admin: {
        email: 'admin@resumerag.com',
        password: 'admin123',
        role: 'admin'
      }
    },
    requirements: {
      idempotency: 'All POST requests require Idempotency-Key header',
      rateLimit: '60 requests per minute per user',
      authentication: 'Bearer token in Authorization header',
      pagination: 'Use limit and offset query parameters'
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  errorResponse(res, 404, {
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const field = Object.keys(error.errors)[0];
    return errorResponse(res, 400, {
      code: 'VALIDATION_ERROR',
      field,
      message: error.errors[field].message
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return errorResponse(res, 400, {
      code: 'DUPLICATE_FIELD',
      field,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, {
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return errorResponse(res, 401, {
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
    });
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 400, {
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds limit'
    });
  }

  // Default error response
  errorResponse(res, 500, {
    code: 'INTERNAL_ERROR',
    message: 'An internal server error occurred'
  });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// Validate MongoDB URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')));
  process.exit(1);
}

if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
  console.error('Current value:', MONGODB_URI.substring(0, 20) + '...');
  process.exit(1);
}

console.log('🔌 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

export default app;