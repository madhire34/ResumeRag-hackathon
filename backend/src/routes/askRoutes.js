import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { askController } from '../controllers/askController.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation middleware for ask query
const askValidation = [
  body('query')
    .notEmpty()
    .withMessage('Query is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Query must be between 3 and 500 characters'),
  body('k')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('k must be between 1 and 20')
    .toInt(),
  body('includeJobContext')
    .optional()
    .isBoolean()
    .withMessage('includeJobContext must be a boolean')
    .toBoolean(),
  body('filters')
    .optional()
    .isObject()
    .withMessage('filters must be an object'),
  body('filters.skills')
    .optional()
    .isArray()
    .withMessage('skills filter must be an array'),
  body('filters.experienceLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'lead', 'executive'])
    .withMessage('Invalid experience level'),
  body('filters.location')
    .optional()
    .isString()
    .withMessage('location filter must be a string')
];

// POST /api/ask - Query resumes using RAG
router.post('/', authenticateToken, askValidation, askController.queryResumes);

// POST /api/ask/semantic - Semantic search without AI generation
router.post('/semantic', authenticateToken, [
  body('query').notEmpty().withMessage('Query is required'),
  body('k').optional().isInt({ min: 1, max: 50 }).toInt()
], askController.semanticSearch);

// POST /api/ask/suggestions - Get query suggestions based on available data
router.post('/suggestions', authenticateToken, [
  body('partial').optional().isString().withMessage('partial must be a string')
], askController.getQuerySuggestions);

export default router;