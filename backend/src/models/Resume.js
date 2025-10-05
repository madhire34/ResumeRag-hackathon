import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Extracted content
  text: {
    type: String,
    required: true,
    index: 'text'
  },
  textLength: {
    type: Number,
    required: true
  },
  
  // PII and redacted versions
  personalInfo: {
    name: String,
    email: String,
    phone: String,
    address: String,
    dateOfBirth: String,
    linkedIn: String,
    github: String,
    portfolio: String
  },
  redactedText: {
    type: String,
    required: true
  },
  
  // Structured data extracted by AI
  extractedData: {
    skills: [{
      name: String,
      category: String, // technical, soft, language, etc.
      proficiency: String // beginner, intermediate, advanced, expert
    }],
    experience: [{
      company: String,
      position: String,
      location: String,
      startDate: String,
      endDate: String,
      description: String,
      achievements: [String],
      technologies: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      gpa: String,
      startDate: String,
      endDate: String,
      achievements: [String]
    }],
    certifications: [{
      name: String,
      issuer: String,
      issueDate: String,
      expiryDate: String,
      credentialId: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
      startDate: String,
      endDate: String
    }],
    languages: [{
      name: String,
      proficiency: String // native, fluent, intermediate, basic
    }]
  },
  
  // Embeddings for semantic search
  embedding: {
    type: [Number],
    required: true
  },
  embeddingModel: {
    type: String,
    default: 'text-embedding-ada-002'
  },
  
  // Metadata
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  processingErrors: [String],
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  matchCount: {
    type: Number,
    default: 0
  },
  lastViewed: Date,
  lastMatched: Date,
  
  // Search optimization
  searchKeywords: [String],
  yearsOfExperience: Number,
  currentPosition: String,
  currentCompany: String,
  location: String,
  availabilityStatus: {
    type: String,
    enum: ['available', 'not_looking', 'open_to_offers'],
    default: 'available'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
resumeSchema.index({ uploadedBy: 1 });
resumeSchema.index({ status: 1 });
resumeSchema.index({ 'extractedData.skills.name': 1 });
resumeSchema.index({ 'extractedData.experience.position': 1 });
resumeSchema.index({ yearsOfExperience: 1 });
resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ 
  'extractedData.skills.name': 'text',
  'extractedData.experience.position': 'text',
  currentPosition: 'text'
});

// Virtual for determining if PII should be shown
resumeSchema.virtual('showPII').get(function() {
  return this.populated('uploadedBy') && this.uploadedBy.role === 'recruiter';
});

// Method to get safe data for candidates
resumeSchema.methods.getSafeData = function(userRole) {
  const safeData = this.toObject();
  
  if (userRole !== 'recruiter' && userRole !== 'admin') {
    // Hide PII for non-recruiters
    safeData.text = safeData.redactedText;
    delete safeData.personalInfo;
    delete safeData.redactedText;
  }
  
  return safeData;
};

// Method to generate search keywords
resumeSchema.methods.generateSearchKeywords = function() {
  const keywords = new Set();
  
  // Add skills
  this.extractedData.skills.forEach(skill => {
    keywords.add(skill.name.toLowerCase());
    keywords.add(skill.category?.toLowerCase());
  });
  
  // Add experience
  this.extractedData.experience.forEach(exp => {
    keywords.add(exp.position?.toLowerCase());
    keywords.add(exp.company?.toLowerCase());
    exp.technologies?.forEach(tech => keywords.add(tech.toLowerCase()));
  });
  
  // Add education
  this.extractedData.education.forEach(edu => {
    keywords.add(edu.degree?.toLowerCase());
    keywords.add(edu.field?.toLowerCase());
    keywords.add(edu.institution?.toLowerCase());
  });
  
  this.searchKeywords = Array.from(keywords).filter(Boolean);
};

// Method to redact PII from text
resumeSchema.methods.redactPII = function() {
  if (!this.text) return;
  
  let redacted = this.text;
  
  // Redact email addresses
  redacted = redacted.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL REDACTED]');
  
  // Redact phone numbers
  redacted = redacted.replace(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE REDACTED]');
  
  // Redact addresses (simplified)
  redacted = redacted.replace(/\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Way|Place|Pl)[\w\s,]*\d{5}/gi, '[ADDRESS REDACTED]');
  
  // Redact social security numbers
  redacted = redacted.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN REDACTED]');
  
  // Redact dates of birth (MM/DD/YYYY pattern)
  redacted = redacted.replace(/\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g, '[DOB REDACTED]');
  
  this.redactedText = redacted;
};

// Pre-save middleware
resumeSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.textLength = this.text.length;
    this.redactPII();
  }
  
  if (this.isModified('extractedData')) {
    this.generateSearchKeywords();
    
    // Calculate years of experience
    let totalYears = 0;
    this.extractedData.experience.forEach(exp => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate === 'present' ? new Date() : new Date(exp.endDate);
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        totalYears += Math.max(0, years);
      }
    });
    this.yearsOfExperience = Math.round(totalYears * 10) / 10;
    
    // Set current position and company
    const currentExp = this.extractedData.experience.find(exp => 
      exp.endDate === 'present' || exp.endDate === 'current' || !exp.endDate
    );
    if (currentExp) {
      this.currentPosition = currentExp.position;
      this.currentCompany = currentExp.company;
    }
  }
  
  next();
});

export default mongoose.model('Resume', resumeSchema);