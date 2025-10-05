import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  remoteType: {
    type: String,
    enum: ['on-site', 'remote', 'hybrid'],
    default: 'on-site'
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    required: true
  },
  
  // Job details
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  responsibilities: [String],
  requirements: {
    type: [String],
    required: true,
    validate: [arrayLimit, '{PATH} must have at least one requirement']
  },
  preferredQualifications: [String],
  
  // Compensation
  salaryRange: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  benefits: [String],
  
  // Technical requirements
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  
  // Application details
  applicationDeadline: Date,
  startDate: Date,
  contactEmail: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  applicationUrl: String,
  
  // Status and metadata
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'cancelled'],
    default: 'active'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Embeddings for semantic matching
  embedding: {
    type: [Number],
    required: true
  },
  embeddingModel: {
    type: String,
    default: 'text-embedding-ada-002'
  },
  
  // Analytics and matching
  viewCount: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  matchingResults: {
    type: Map,
    of: {
      score: Number,
      matchedSkills: [String],
      missingSkills: [String],
      matchedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  
  // Search optimization
  searchKeywords: [String],
  
  // Company info
  companyInfo: {
    size: String, // startup, small, medium, large, enterprise
    industry: String,
    website: String,
    description: String
  }
}, {
  timestamps: true
});

function arrayLimit(val) {
  return val.length > 0;
}

// Indexes for efficient querying
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ 'skills.name': 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ employmentType: 1 });
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ applicationDeadline: 1 });

// Virtual for salary display
jobSchema.virtual('salaryDisplay').get(function() {
  if (!this.salaryRange || (!this.salaryRange.min && !this.salaryRange.max)) {
    return 'Salary not specified';
  }
  
  const formatSalary = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount}`;
    }
  };
  
  const { min, max, period = 'yearly' } = this.salaryRange;
  const periodText = period === 'yearly' ? '/year' : period === 'monthly' ? '/month' : '/hour';
  
  if (min && max) {
    return `${formatSalary(min)} - ${formatSalary(max)}${periodText}`;
  } else if (min) {
    return `${formatSalary(min)}+${periodText}`;
  } else if (max) {
    return `Up to ${formatSalary(max)}${periodText}`;
  }
});

// Method to generate search keywords
jobSchema.methods.generateSearchKeywords = function() {
  const keywords = new Set();
  
  // Add basic fields
  keywords.add(this.title?.toLowerCase());
  keywords.add(this.company?.toLowerCase());
  keywords.add(this.location?.toLowerCase());
  keywords.add(this.department?.toLowerCase());
  keywords.add(this.remoteType?.toLowerCase());
  keywords.add(this.employmentType?.toLowerCase());
  keywords.add(this.experienceLevel?.toLowerCase());
  
  // Add skills
  this.skills?.forEach(skill => {
    keywords.add(skill.name?.toLowerCase());
  });
  
  // Add requirements keywords
  this.requirements?.forEach(req => {
    const words = req.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
  });
  
  this.searchKeywords = Array.from(keywords).filter(Boolean);
};

// Method to calculate match score with a resume
jobSchema.methods.calculateMatchScore = function(resume) {
  if (!this.embedding || !resume.embedding || this.embedding.length === 0 || resume.embedding.length === 0) {
    return {
      overallScore: 0,
      semanticSimilarity: 0,
      skillsMatch: 0,
      experienceMatch: 0,
      matchedSkills: [],
      missingSkills: [],
      evidence: []
    };
  }
  
  // Calculate cosine similarity
  const semanticSimilarity = this.calculateCosineSimilarity(this.embedding, resume.embedding);
  
  // Calculate skills match
  const jobSkills = this.skills.map(s => s.name.toLowerCase());
  const resumeSkills = resume.extractedData?.skills?.map(s => s.name.toLowerCase()) || [];
  
  const matchedSkills = jobSkills.filter(skill => 
    resumeSkills.some(rSkill => 
      rSkill.includes(skill) || skill.includes(rSkill)
    )
  );
  
  const missingSkills = jobSkills.filter(skill => !matchedSkills.includes(skill));
  const skillsMatchPercentage = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0;
  
  // Calculate experience match
  const requiredLevel = this.experienceLevel;
  const candidateYears = resume.yearsOfExperience || 0;
  
  let experienceMatch = 0;
  switch (requiredLevel) {
    case 'entry':
      experienceMatch = candidateYears >= 0 ? 1 : 0.5;
      break;
    case 'mid':
      experienceMatch = candidateYears >= 2 ? 1 : candidateYears >= 1 ? 0.7 : 0.4;
      break;
    case 'senior':
      experienceMatch = candidateYears >= 5 ? 1 : candidateYears >= 3 ? 0.8 : 0.3;
      break;
    case 'lead':
      experienceMatch = candidateYears >= 8 ? 1 : candidateYears >= 5 ? 0.7 : 0.2;
      break;
    case 'executive':
      experienceMatch = candidateYears >= 12 ? 1 : candidateYears >= 8 ? 0.6 : 0.1;
      break;
  }
  
  // Calculate overall score (weighted average)
  const overallScore = (
    semanticSimilarity * 0.4 +
    skillsMatchPercentage * 0.4 +
    experienceMatch * 0.2
  );
  
  // Generate evidence
  const evidence = [];
  if (matchedSkills.length > 0) {
    evidence.push(`Matched skills: ${matchedSkills.slice(0, 5).join(', ')}`);
  }
  if (candidateYears > 0) {
    evidence.push(`${candidateYears} years of experience`);
  }
  if (resume.currentPosition) {
    evidence.push(`Current position: ${resume.currentPosition}`);
  }
  
  return {
    overallScore: Math.round(overallScore * 100) / 100,
    semanticSimilarity: Math.round(semanticSimilarity * 100) / 100,
    skillsMatch: Math.round(skillsMatchPercentage * 100) / 100,
    experienceMatch: Math.round(experienceMatch * 100) / 100,
    matchedSkills,
    missingSkills,
    evidence
  };
};

// Helper method for cosine similarity
jobSchema.methods.calculateCosineSimilarity = function(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
};

// Pre-save middleware
jobSchema.pre('save', function(next) {
  this.generateSearchKeywords();
  next();
});

export default mongoose.model('Job', jobSchema);