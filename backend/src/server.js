import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
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

// A missing JWT secret would make every login crash with
// "secretOrPrivateKey must have a value". Generate an ephemeral one so the
// app still works; tokens simply stop being valid after a restart.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET is not set - generated an ephemeral secret (logins reset on restart)');
}

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

// CORS middleware with dynamic origin checking for Vercel preview deployments
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
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
let embeddedMongoServer = null;

async function seedDemoUsers() {
  if (process.env.SEED_DEMO_USERS === 'false') return;
  try {
    const { default: User } = await import('./models/User.js');
    if (await User.countDocuments() > 0) return;

    const demoUsers = [
      { name: 'Admin User', email: 'admin@resumerag.com', password: 'admin123', role: 'admin' },
      { name: 'Sarah Mitchell', email: 'recruiter@resumerag.com', password: 'test123', role: 'recruiter', company: 'TechCorp Inc.', phone: '+1-555-0123' },
      { name: 'John Candidate', email: 'candidate@resumerag.com', password: 'test123', role: 'candidate' },
    ];
    for (const user of demoUsers) {
      await User.create({ ...user, isActive: true, emailVerified: true });
    }
    console.log('🌱 Seeded demo users (admin@resumerag.com / admin123, recruiter@resumerag.com / test123, candidate@resumerag.com / test123)');
  } catch (err) {
    console.error('⚠️  Demo user seeding failed:', err.message);
  }
}

async function startDatabase() {
  if (MONGODB_URI) {
    try {
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ Connected to MongoDB');
      return;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      if (process.env.ALLOW_EMBEDDED_DB === 'false') throw err;
    }
  } else {
    console.warn('⚠️  MONGODB_URI is not set');
  }

  // Free MongoDB Atlas clusters often get deleted, which used to crash the
  // server at boot (querySrv ENOTFOUND). Fall back to an embedded MongoDB so
  // the API still works; data is intentionally ephemeral.
  console.warn('⚠️  Starting embedded MongoDB (data resets whenever the service restarts)');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  embeddedMongoServer = await MongoMemoryServer.create({
    binary: { version: process.env.EMBEDDED_MONGO_VERSION || '6.0.14' },
    instance: { dbName: 'resumerag', storageEngine: 'ephemeralForTest' }
  });
  const embeddedUri = embeddedMongoServer.getUri('resumerag');
  await mongoose.connect(embeddedUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Connected to embedded MongoDB');
}

startDatabase()
.then(async () => {
  await seedDemoUsers();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully');
    server.close(async () => {
      await mongoose.connection.close();
      if (embeddedMongoServer) await embeddedMongoServer.stop();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})
.catch(err => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});

export default app;