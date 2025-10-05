import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { pdf as pdfParse } from 'pdf-parse';
import { body, query, validationResult } from 'express-validator';

import Resume from '../models/Resume.js';
import aiService from '../services/aiService.js';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '../utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and ZIP files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Validation middleware
export const uploadValidation = [
  // File validation is handled by multer
];

export const listValidation = [
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

// Process a single PDF file
async function processPdfFile(filePath, originalName, userId) {
  try {
    console.log(`📄 Processing PDF: ${originalName}`);
    
    const fileBuffer = await fs.readFile(filePath);
    const fileSize = fileBuffer.length;
    const fileName = path.basename(filePath);
    
    console.log(`📈 File size: ${fileSize} bytes`);
    
    // Extract text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text;
    
    console.log(`📝 Extracted text length: ${text.length} characters`);
    
    if (text.length < 100) {
      throw new Error('PDF appears to be empty or text could not be extracted');
    }
    
    // Generate embedding
    console.log('🔍 Generating embedding...');
    const embedding = await aiService.generateEmbedding(text);
    
    // Extract structured data
    console.log('🧠 Extracting structured data...');
    const extractedData = await aiService.extractResumeData(text);
    
    // Create redacted text (simple PII redaction)
    let redactedText = text;
    if (extractedData.personalInfo) {
      const pii = extractedData.personalInfo;
      
      // Escape special regex characters and replace email
      if (pii.email) {
        const escapedEmail = pii.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        redactedText = redactedText.replace(new RegExp(escapedEmail, 'gi'), '[EMAIL]');
      }
      
      // Escape special regex characters and replace phone
      if (pii.phone) {
        const escapedPhone = pii.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-()\s]/g, '\\s*');
        try {
          redactedText = redactedText.replace(new RegExp(escapedPhone, 'gi'), '[PHONE]');
        } catch (regexError) {
          console.warn('Failed to redact phone number:', regexError.message);
        }
      }
      
      // Escape special regex characters and replace address
      if (pii.address) {
        const escapedAddress = pii.address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        redactedText = redactedText.replace(new RegExp(escapedAddress, 'gi'), '[ADDRESS]');
      }
    }
    
    // Extract summary fields
    const yearsOfExperience = extractedData.experience?.length > 0 
      ? Math.max(...extractedData.experience.map(exp => {
          const start = parseInt(exp.startDate) || new Date().getFullYear();
          const end = exp.endDate === 'present' ? new Date().getFullYear() : (parseInt(exp.endDate) || start);
          return end - start;
        }))
      : 0;
    
    const currentPosition = extractedData.experience?.[0]?.position || '';
    const currentCompany = extractedData.experience?.[0]?.company || '';
    const location = extractedData.personalInfo?.address || '';
    
    // Create resume document
    const resume = new Resume({
      filename: fileName,
      originalName,
      fileSize,
      mimeType: 'application/pdf',
      uploadedBy: userId,
      text,
      textLength: text.length,
      redactedText,
      embedding,
      extractedData,
      personalInfo: extractedData.personalInfo || {},
      yearsOfExperience,
      currentPosition,
      currentCompany,
      location,
      status: 'completed'
    });
    
    await resume.save();
    console.log(`✅ Resume saved with ID: ${resume._id}`);
    
    // Clean up file
    await fs.unlink(filePath);
    
    return resume;
  } catch (error) {
    console.error(`❌ Error processing ${originalName}:`, error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Try to clean up file even if processing failed
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('Failed to clean up file:', cleanupError);
    }
    throw error;
  }
}

// Upload resumes endpoint
export const uploadResumes = async (req, res) => {
  const uploadSingle = upload.single('file');
  
  uploadSingle(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, 400, {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 50MB limit'
        });
      } else if (err.message === 'Only PDF and ZIP files are allowed') {
        return errorResponse(res, 400, {
          code: 'INVALID_FILE_TYPE',
          message: 'Only PDF and ZIP files are allowed'
        });
      }
      return errorResponse(res, 400, {
        code: 'UPLOAD_ERROR',
        message: err.message
      });
    }

    try {
      if (!req.file) {
        return errorResponse(res, 400, {
          code: 'NO_FILE',
          message: 'No file uploaded'
        });
      }

      const { file } = req;
      const { originalname, filename, path: filePath } = file;
      const userId = req.user._id;
      const processedResumes = [];

      console.log(`🔄 Processing file: ${originalname}`);
      console.log(`📁 File path: ${filePath}`);
      console.log(`👤 User ID: ${userId}`);

      // Check if it's a ZIP file
      if (originalname.toLowerCase().endsWith('.zip') || file.mimetype.includes('zip')) {
        console.log('📦 Processing ZIP file...');
        
        try {
          const zip = new AdmZip(filePath);
          const entries = zip.getEntries();
          const pdfEntries = entries.filter(entry => 
            !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')
          );

          if (pdfEntries.length === 0) {
            await fs.unlink(filePath);
            return errorResponse(res, 400, {
              code: 'NO_PDF_IN_ZIP',
              message: 'No PDF files found in ZIP archive'
            });
          }

          console.log(`Found ${pdfEntries.length} PDF files in ZIP`);

          // Extract and process each PDF
          const tempDir = path.join(path.dirname(filePath), 'temp_' + Date.now());
          await fs.mkdir(tempDir, { recursive: true });

          try {
            for (const entry of pdfEntries) {
              const pdfPath = path.join(tempDir, entry.entryName);
              await fs.writeFile(pdfPath, entry.getData());
              
              try {
                const resume = await processPdfFile(pdfPath, entry.entryName, userId);
                processedResumes.push({
                  id: resume._id,
                  filename: resume.originalName,
                  status: resume.status
                });
              } catch (pdfError) {
                console.error(`Failed to process ${entry.entryName}:`, pdfError);
                processedResumes.push({
                  filename: entry.entryName,
                  status: 'failed',
                  error: pdfError.message
                });
              }
            }
            
            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (tempError) {
            // Ensure temp directory is cleaned up even on error
            try {
              await fs.rm(tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
              console.error('Failed to clean up temp directory:', cleanupError);
            }
            throw tempError;
          }

          // Clean up original ZIP file
          await fs.unlink(filePath);
          
        } catch (zipError) {
          console.error('ZIP processing error:', zipError);
          try {
            await fs.unlink(filePath);
          } catch (cleanupError) {
            console.error('Failed to clean up ZIP file:', cleanupError);
          }
          return errorResponse(res, 400, {
            code: 'ZIP_PROCESSING_ERROR',
            message: 'Failed to process ZIP file: ' + zipError.message
          });
        }
      } else {
        // Process single PDF file
        try {
          const resume = await processPdfFile(filePath, originalname, userId);
          processedResumes.push({
            id: resume._id,
            filename: resume.originalName,
            status: resume.status
          });
        } catch (pdfError) {
          return errorResponse(res, 400, {
            code: 'PDF_PROCESSING_ERROR',
            message: 'Failed to process PDF: ' + pdfError.message
          });
        }
      }

      const successCount = processedResumes.filter(r => r.status === 'completed').length;
      const failCount = processedResumes.filter(r => r.status === 'failed').length;

      successResponse(res, 201, {
        processed: processedResumes,
        summary: {
          total: processedResumes.length,
          successful: successCount,
          failed: failCount
        }
      }, `Successfully processed ${successCount} resume(s)`);

    } catch (error) {
      console.error('Resume upload error:', error);
      errorResponse(res, 500, {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process uploaded file(s)'
      });
    }
  });
};

// Get resumes list with pagination and search
export const getResumes = async (req, res) => {
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
    let query = {};
    
    // If not recruiter/admin, only show own resumes
    if (userRole !== 'recruiter' && userRole !== 'admin') {
      query.uploadedBy = req.user._id;
    }

    // Add search functionality
    if (searchQuery) {
      query.$or = [
        { 'extractedData.skills.name': { $regex: searchQuery, $options: 'i' } },
        { 'extractedData.experience.position': { $regex: searchQuery, $options: 'i' } },
        { 'extractedData.experience.company': { $regex: searchQuery, $options: 'i' } },
        { currentPosition: { $regex: searchQuery, $options: 'i' } },
        { originalName: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Only show completed resumes
    query.status = 'completed';

    const total = await Resume.countDocuments(query);
    
    let resumeQuery = Resume.find(query)
      .select(userRole === 'recruiter' || userRole === 'admin' 
        ? '-redactedText -text' // Show all data to recruiters/admins but not full text
        : '-personalInfo -text') // Hide PII from candidates
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const resumes = await resumeQuery.exec();

    // Transform data based on user role
    const transformedResumes = resumes.map(resume => {
      const data = resume.toObject();
      
      if (userRole !== 'recruiter' && userRole !== 'admin') {
        // For non-recruiters, use redacted text if text is requested
        delete data.personalInfo;
      }
      
      return data;
    });

    paginatedResponse(res, transformedResumes, {
      total,
      limit,
      offset
    }, 'Resumes retrieved successfully');

  } catch (error) {
    console.error('Get resumes error:', error);
    errorResponse(res, 500, {
      code: 'FETCH_ERROR',
      message: 'Failed to retrieve resumes'
    });
  }
};

// Get single resume by ID
export const getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    let query = Resume.findById(id).populate('uploadedBy', 'name email role');

    // Authorization check
    if (userRole !== 'recruiter' && userRole !== 'admin') {
      query = query.where('uploadedBy').equals(req.user._id);
    }

    const resume = await query.exec();

    if (!resume) {
      return errorResponse(res, 404, {
        code: 'RESUME_NOT_FOUND',
        message: 'Resume not found or access denied'
      });
    }

    // Increment view count
    resume.viewCount += 1;
    resume.lastViewed = new Date();
    await resume.save();

    // Transform response based on user role
    const responseData = resume.getSafeData(userRole);

    successResponse(res, 200, responseData, 'Resume retrieved successfully');

  } catch (error) {
    console.error('Get resume error:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid resume ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'FETCH_ERROR',
      message: 'Failed to retrieve resume'
    });
  }
};

// Delete resume
export const deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    let query = Resume.findById(id);

    // Authorization check - only allow deletion of own resumes unless admin
    if (userRole !== 'admin') {
      query = query.where('uploadedBy').equals(req.user._id);
    }

    const resume = await query.exec();

    if (!resume) {
      return errorResponse(res, 404, {
        code: 'RESUME_NOT_FOUND',
        message: 'Resume not found or access denied'
      });
    }

    await Resume.findByIdAndDelete(id);

    successResponse(res, 200, null, 'Resume deleted successfully');

  } catch (error) {
    console.error('Delete resume error:', error);
    if (error.name === 'CastError') {
      return errorResponse(res, 400, {
        code: 'INVALID_ID',
        field: 'id',
        message: 'Invalid resume ID format'
      });
    }
    errorResponse(res, 500, {
      code: 'DELETE_ERROR',
      message: 'Failed to delete resume'
    });
  }
};