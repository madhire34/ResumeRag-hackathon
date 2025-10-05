import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['candidate', 'recruiter', 'admin'],
    default: 'candidate'
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100,
    required: function() {
      return this.role === 'recruiter';
    }
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]{10,15}$/, 'Please enter a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  // Rate limiting
  requestCount: {
    type: Number,
    default: 0
  },
  requestWindowStart: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.requestCount;
      delete ret.requestWindowStart;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Account locking methods
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we've reached max attempts and it's not locked yet, lock account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // Lock for 30 minutes
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Rate limiting methods
userSchema.methods.isRateLimited = function() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60;
  
  if (!this.requestWindowStart || Date.now() - this.requestWindowStart > windowMs) {
    // Reset window
    this.requestWindowStart = new Date();
    this.requestCount = 0;
    return false;
  }
  
  return this.requestCount >= maxRequests;
};

userSchema.methods.incrementRequestCount = function() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
  
  if (!this.requestWindowStart || Date.now() - this.requestWindowStart > windowMs) {
    this.requestWindowStart = new Date();
    this.requestCount = 1;
  } else {
    this.requestCount += 1;
  }
  
  return this.save();
};

export default mongoose.model('User', userSchema);