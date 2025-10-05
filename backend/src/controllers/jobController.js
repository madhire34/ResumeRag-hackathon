import { body, query, validationResult } from 'express-validator';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import openaiService from '../services/openaiService.js';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '../utils/apiResponse.js';

// Validation middleware
export const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('company')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company must be between 2 and 100 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('requirements')
    .isArray({ min: 1 })
    .withMessage('Requirements must be an array with at least one item'),
  body('requirements.*')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Each requirement must be between 2 and 200 characters'),
  body('experienceLevel')
    .isIn(['entry', 'mid', 'senior', 'lead', 'executive'])
    .withMessage('Experience level must be one of: entry, mid, senior, lead, executive'),
  body('employmentType')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'temporary'])
    .withMessage('Employment type must be one of: full-time, part-time, contract, internship, temporary'),
  body('remoteType')
    .optional()
    .isIn(['on-site', 'remote', 'hybrid'])
    .withMessage('Remote type must be one of: on-site, remote, hybrid'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('salaryRange.min')
    .optional()
    .isNumeric()
    .withMessage('Salary minimum must be a number'),
  body('salaryRange.max')
    .optional()
    .isNumeric()
    .withMessage('Salary maximum must be a number')
];

export const listJobsValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
  query('q')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Search query too long')
];

export const matchJobValidation = [
  body('top_n')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('top_n must be between 1 and 50')
];

// Create job
export const createJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const jobData = {
      ...req.body,
      postedBy: req.user._id
    };

    // Generate embedding for the job
    console.log('🔍 Generating job embedding...');
    const embeddingText = `${jobData.title} ${jobData.company} ${jobData.description} ${jobData.requirements.join(' ')}`;
    const embedding = await openaiService.generateEmbedding(embeddingText);
    jobData.embedding = embedding;

    // Process skills array if provided
    if (jobData.skills && Array.isArray(jobData.skills)) {
      jobData.skills = jobData.skills.map(skill => {
        if (typeof skill === 'string') {
          return { name: skill, level: 'intermediate', required: false };
        }
        return skill;
      });
    }

    const job = new Job(jobData);
    await job.save();

    console.log(`✅ Job created with ID: ${job._id}`);

    successResponse(res, 201, {
      id: job._id,
      title: job.title,
      company: job.company,
      location: job.location,
      experienceLevel: job.experienceLevel,
      status: job.status,
      createdAt: job.createdAt
    }, 'Job created successfully');

  } catch (error) {
    console.error('Job creation error:', error);
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return errorResponse(res, 400, {
        code: 'VALIDATION_ERROR',
        field,
        message: error.errors[field].message
      });
    }
    errorResponse(res, 500, {
      code: 'JOB_CREATION_ERROR',
      message: 'Failed to create job'
    });
  }
};

// Get jobs list
export const getJobs = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const searchQuery = req.query.q || '';
    const userRole = req.user.role;

    // Build query
    let query = { status: 'active' };

    // Add search functionality
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { company: { $regex: searchQuery, $options: 'i' } },
        { location: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { 'skills.name': { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const total = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .populate('postedBy', 'name company email')
      .select('-embedding -matchingResults') // Don't return large arrays
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    paginatedResponse(res, jobs, {
      total,
      limit,
      offset
    }, 'Jobs retrieved successfully');

  } catch (error) {
    console.error('Get jobs error:', error);
    errorResponse(res, 500, {
      code: 'FETCH_ERROR',
      message: 'Failed to retrieve jobs'
    });
  }
};

// Get job by ID
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id)
      .populate('postedBy', 'name company email')
      .select('-embedding -matchingResults');

    if (!job) {
      return errorResponse(res, 404, {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }

    // Increment view count
    job.viewCount += 1;
    await job.save();

    successResponse(res, 200, job, 'Job retrieved successfully');

  } catch (error) {
    console.error('Get job error:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid job ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'FETCH_ERROR',
      message: 'Failed to retrieve job'
    });
  }
};

// Match resumes against job
export const matchResumesToJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { id } = req.params;
    const { top_n = 10 } = req.body;

    // Get the job
    const job = await Job.findById(id);
    if (!job) {
      return errorResponse(res, 404, {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }

    // Check if user owns this job or is admin/recruiter
    if (req.user.role !== 'admin' && req.user.role !== 'recruiter' && 
        !job.postedBy.equals(req.user._id)) {
      return errorResponse(res, 403, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access denied. You can only match your own jobs.'
      });
    }

    console.log(`🔍 Finding matches for job: ${job.title}`);

    // Get all completed resumes
    const resumes = await Resume.find({ 
      status: 'completed',
      embedding: { $exists: true, $ne: [] }
    });

    if (resumes.length === 0) {
      return successResponse(res, 200, {
        jobId: job._id,
        jobTitle: job.title,
        matches: [],
        totalCandidates: 0,
        message: 'No resumes found for matching'
      }, 'No matches found');
    }

    console.log(`Found ${resumes.length} resumes to match against`);

    // Calculate match scores
    const matches = resumes.map(resume => {
      const matchResult = job.calculateMatchScore(resume);
      
      return {
        resumeId: resume._id,
        candidateName: resume.personalInfo?.name || 'Anonymous',
        filename: resume.originalName,
        overallScore: matchResult.overallScore,
        semanticSimilarity: matchResult.semanticSimilarity,
        skillsMatch: matchResult.skillsMatch,
        experienceMatch: matchResult.experienceMatch,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        evidence: matchResult.evidence,
        yearsOfExperience: resume.yearsOfExperience,
        currentPosition: resume.currentPosition,
        uploadedAt: resume.createdAt
      };
    });

    // Sort by overall score (descending) and take top N
    matches.sort((a, b) => b.overallScore - a.overallScore);
    const topMatches = matches.slice(0, top_n);

    // Update job's matching analytics
    job.matchCount = (job.matchCount || 0) + 1;
    job.lastMatched = new Date();
    await job.save();

    console.log(`✅ Found ${topMatches.length} top matches`);

    successResponse(res, 200, {
      jobId: job._id,
      jobTitle: job.title,
      company: job.company,
      matches: topMatches,
      totalCandidates: resumes.length,
      matchingCriteria: {
        semanticSimilarity: '40%',
        skillsMatch: '40%', 
        experienceMatch: '20%'
      }
    }, `Found ${topMatches.length} matching candidates`);

  } catch (error) {
    console.error('Job matching error:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid job ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'MATCHING_ERROR',
      message: 'Failed to match resumes to job'
    });
  }
};

// Update job (only by owner or admin)
export const updateJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return errorResponse(res, 404, {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && !job.postedBy.equals(req.user._id)) {
      return errorResponse(res, 403, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access denied. You can only update your own jobs.'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'requirements', 'location', 'employmentType',
      'remoteType', 'salaryRange', 'benefits', 'skills', 'status'
    ];

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

    // If key fields changed, regenerate embedding
    const keyFields = ['title', 'description', 'requirements'];
    const needsNewEmbedding = keyFields.some(field => updates[field]);

    if (needsNewEmbedding) {
      const embeddingText = `${updates.title || job.title} ${updates.description || job.description} ${(updates.requirements || job.requirements).join(' ')}`;
      updates.embedding = await openaiService.generateEmbedding(embeddingText);
    }

    const updatedJob = await Job.findByIdAndUpdate(id, updates, { 
      new: true, 
      runValidators: true 
    }).populate('postedBy', 'name company email');

    successResponse(res, 200, updatedJob, 'Job updated successfully');

  } catch (error) {
    console.error('Job update error:', error);
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return errorResponse(res, 400, {
        code: 'VALIDATION_ERROR',
        field,
        message: error.errors[field].message
      });
    }
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid job ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'UPDATE_ERROR',
      message: 'Failed to update job'
    });
  }
};

// Delete job
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return errorResponse(res, 404, {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && !job.postedBy.equals(req.user._id)) {
      return errorResponse(res, 403, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access denied. You can only delete your own jobs.'
      });
    }

    await Job.findByIdAndDelete(id);

    successResponse(res, 200, null, 'Job deleted successfully');

  } catch (error) {
    console.error('Job deletion error:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid job ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'DELETE_ERROR',
      message: 'Failed to delete job'
    });
  }
};