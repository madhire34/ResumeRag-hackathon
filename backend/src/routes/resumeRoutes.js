import express from 'express';
import { 
  uploadResumes,
  getResumes,
  getResumeById,
  deleteResume,
  uploadValidation,
  listValidation
} from '../controllers/resumeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All resume routes require authentication
router.use(authenticate);

// Resume routes
router.post('/', uploadValidation, uploadResumes);
router.get('/', listValidation, getResumes);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);

export default router;