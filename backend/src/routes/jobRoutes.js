import express from 'express';
import {
  createJob,
  getJobs,
  getJobById,
  matchResumesToJob,
  updateJob,
  deleteJob,
  createJobValidation,
  listJobsValidation,
  matchJobValidation
} from '../controllers/jobController.js';
import { authenticate, requireRecruiter } from '../middleware/auth.js';

const router = express.Router();

// All job routes require authentication
router.use(authenticate);

// Job CRUD routes
router.post('/', requireRecruiter, createJobValidation, createJob);
router.get('/', listJobsValidation, getJobs);
router.get('/:id', getJobById);
router.put('/:id', requireRecruiter, createJobValidation, updateJob);
router.delete('/:id', requireRecruiter, deleteJob);

// Job matching route
router.post('/:id/match', requireRecruiter, matchJobValidation, matchResumesToJob);

export default router;