import { validationResult } from 'express-validator';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import { ragService } from '../services/ragService.js';
import aiService from '../services/aiService.js';

// Split a free-text query into MongoDB-safe keywords for the no-AI fallback.
function buildKeywordRegexes(query) {
  return (query || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(word => word.length > 2)
    .slice(0, 8)
    .map(word => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

// Keyword search used when no embedding provider (OpenAI/Ollama) is configured,
// so search still returns real candidates instead of failing.
async function keywordSearchResumes(query, k, filterCriteria = {}) {
  const terms = buildKeywordRegexes(query);
  const base = { ...filterCriteria };

  if (terms.length > 0) {
    base.$or = [
      { text: { $in: terms } },
      { currentPosition: { $in: terms } },
      { 'personalInfo.name': { $in: terms } },
      { 'personalInfo.summary': { $in: terms } },
      { 'extractedData.skills.name': { $in: terms } }
    ];
  }

  const docs = await Resume.find(base).limit(Math.max(k * 3, 30)).lean();
  if (docs.length === 0) return [];

  const score = doc => {
    if (terms.length === 0) return 0;
    const haystack = [
      doc.text || '',
      doc.currentPosition || '',
      doc.personalInfo?.name || '',
      doc.personalInfo?.summary || '',
      (doc.extractedData?.skills || []).map(s => s.name).join(' ')
    ].join(' ').toLowerCase();
    return terms.reduce((hits, re) => hits + (re.test(haystack) ? 1 : 0), 0) / terms.length;
  };

  return docs
    .map(doc => ({ ...doc, similarity: score(doc) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export const askController = {
  // Query resumes using RAG
  async queryResumes(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        });
      }

      const { query, k = 5, includeJobContext = false, filters = {} } = req.body;
      const userRole = req.user.role;

      console.log(` RAG Query: "${query}" (k=${k}, user=${req.user.email})`);

      // Check if there are any resumes in the database
      const resumeCount = await Resume.countDocuments({ status: 'completed' });
      if (resumeCount === 0) {
        return successResponse(res, 200, {
          query,
          answer: "No resumes found in the database. Please upload some resumes first.",
          sources: [],
          totalResults: 0,
          filters: filters
        }, 'No resumes available');
      }

      // Build filter criteria
      let filterCriteria = { status: 'completed' };

      if (filters.experienceLevel) {
        const experienceMapping = {
          'entry': { $gte: 0, $lt: 2 },
          'mid': { $gte: 2, $lt: 5 },
          'senior': { $gte: 5, $lt: 8 },
          'lead': { $gte: 8, $lt: 12 },
          'executive': { $gte: 12 }
        };
        filterCriteria.yearsOfExperience = experienceMapping[filters.experienceLevel];
      }

      if (filters.location) {
        filterCriteria.location = new RegExp(filters.location, 'i');
      }

      // Generate query embedding
      console.log('🔢 Generating query embedding...');
      const queryEmbedding = await aiService.generateEmbedding(query);
      const useKeywordFallback = !queryEmbedding || queryEmbedding.length === 0;

      let similarResumes;
      if (useKeywordFallback) {
        console.warn('⚠️  No embedding provider available - falling back to keyword search');
        similarResumes = await keywordSearchResumes(query, k, filterCriteria);
      } else {
        console.log(`✅ Generated embedding with ${queryEmbedding.length} dimensions`);

        // Find similar resumes using vector search
        console.log('🔍 Searching for similar resumes...');
        similarResumes = await ragService.findSimilarResumes(
          queryEmbedding,
          k,
          filterCriteria,
          userRole
        );
      }

      console.log(`📊 Found ${similarResumes.length} similar resumes`);

      if (similarResumes.length === 0) {
        return successResponse(res, 200, {
          query,
          answer: "I couldn't find any resumes that match your query. Please try rephrasing your question or adjusting your filters.",
          sources: [],
          totalResults: 0,
          filters: filters
        }, 'No matching resumes found');
      }

      // Include job context if requested and user is recruiter
      let jobContext = '';
      if (includeJobContext && (userRole === 'recruiter' || userRole === 'admin')) {
        const recentJobs = await Job.find({ 
          postedBy: req.user._id, 
          status: 'active' 
        })
        .limit(3)
        .select('title description requirements skills')
        .lean();

        if (recentJobs.length > 0) {
          jobContext = `\n\nCurrent job openings context:\n${recentJobs.map(job => 
            `- ${job.title}: ${job.description.substring(0, 200)}...`
          ).join('\n')}`;
        }
      }

      // Generate AI answer using RAG (or a plain summary when AI is offline)
      let ragAnswer;
      if (useKeywordFallback) {
        const names = similarResumes
          .map(resume => (userRole === 'recruiter' || userRole === 'admin')
            ? resume.personalInfo?.name
            : null)
          .filter(Boolean);
        ragAnswer = similarResumes.length === 0
          ? `No resumes matched "${query}". Try different keywords, or upload more resumes.`
          : `Keyword search (AI service is offline) found ${similarResumes.length} matching resume(s) for "${query}".`
            + (names.length ? ` Top matches: ${names.join(', ')}.` : '');
      } else {
        ragAnswer = await ragService.generateAnswer(query, similarResumes, jobContext);
      }

      // Prepare evidence snippets
      const evidence = similarResumes.map((resume, index) => ({
        resumeId: resume._id,
        similarity: resume.similarity,
        snippet: ragService.extractRelevantSnippet(resume, query),
        candidateName: userRole === 'recruiter' || userRole === 'admin' 
          ? resume.personalInfo?.name || 'Name not available'
          : `Candidate ${index + 1}`,
        currentPosition: resume.currentPosition || 'Position not specified',
        yearsOfExperience: resume.yearsOfExperience || 0,
        keySkills: resume.extractedData?.skills?.slice(0, 5).map(s => s.name) || []
      }));

      // Track query for analytics
      await ragService.trackQuery(req.user._id, query, similarResumes.length);

      return successResponse(res, 200, {
        query,
        answer: ragAnswer,
        sources: evidence,
        totalResults: similarResumes.length,
        filters: filters,
        metadata: {
          processingTime: Date.now() - req.startTime,
          model: useKeywordFallback ? 'keyword-fallback' : 'gpt-4',
          embeddingModel: useKeywordFallback ? null : 'text-embedding-ada-002'
        }
      }, 'Query processed successfully');

    } catch (error) {
      console.error('❌ Error in queryResumes:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return errorResponse(res, 500, {
        code: 'QUERY_ERROR',
        message: error.message || 'Failed to process query'
      });
    }
  },

  // Semantic search without AI generation
  async semanticSearch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 400, {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        });
      }

      const { query, k = 10 } = req.body;
      const userRole = req.user.role;

      // Generate query embedding
      const queryEmbedding = await aiService.generateEmbedding(query);
      const useKeywordFallback = !queryEmbedding || queryEmbedding.length === 0;

      // Find similar resumes
      const similarResumes = useKeywordFallback
        ? await keywordSearchResumes(query, k, { status: 'completed' })
        : await ragService.findSimilarResumes(
            queryEmbedding,
            k,
            { status: 'completed' },
            userRole
          );

      const results = similarResumes.map((resume, index) => ({
        id: resume._id,
        similarity: resume.similarity,
        candidateName: userRole === 'recruiter' || userRole === 'admin' 
          ? resume.personalInfo?.name || 'Name not available'
          : `Candidate ${index + 1}`,
        currentPosition: resume.currentPosition || 'Position not specified',
        yearsOfExperience: resume.yearsOfExperience || 0,
        keySkills: resume.extractedData?.skills?.slice(0, 8).map(s => s.name) || [],
        snippet: ragService.extractRelevantSnippet(resume, query, 200),
        createdAt: resume.createdAt
      }));

      return successResponse(res, 200, {
        query,
        results,
        totalResults: results.length,
        metadata: {
          searchType: useKeywordFallback ? 'keyword' : 'semantic',
          embeddingModel: useKeywordFallback ? null : 'text-embedding-ada-002'
        }
      }, 'Semantic search completed');

    } catch (error) {
      console.error('Error in semanticSearch:', error);
      return errorResponse(res, 500, {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform semantic search'
      });
    }
  },

  // Get query suggestions
  async getQuerySuggestions(req, res) {
    try {
      const { partial = '' } = req.body;
      
      // Common query patterns and suggestions
      const commonQueries = [
        'Find candidates with Python experience',
        'Show me senior developers with React skills',
        'Candidates with machine learning background',
        'Frontend developers with 3+ years experience',
        'Data scientists with PhD degree',
        'Full-stack developers familiar with AWS',
        'Mobile developers with iOS and Android experience',
        'DevOps engineers with Kubernetes knowledge',
        'Product managers with startup experience',
        'UI/UX designers with Figma skills'
      ];

      // Get skill-based suggestions from database
      const skillAggregation = await Resume.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$extractedData.skills' },
        { $group: { 
          _id: '$extractedData.skills.name', 
          count: { $sum: 1 } 
        }},
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      const skillSuggestions = skillAggregation.map(skill => 
        `Candidates with ${skill._id} skills`
      );

      // Get position-based suggestions
      const positionAggregation = await Resume.aggregate([
        { $match: { status: 'completed', currentPosition: { $exists: true, $ne: null } } },
        { $group: { 
          _id: '$currentPosition', 
          count: { $sum: 1 } 
        }},
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]);

      const positionSuggestions = positionAggregation.map(pos => 
        `${pos._id} candidates`
      );

      // Combine and filter suggestions
      let allSuggestions = [...commonQueries, ...skillSuggestions, ...positionSuggestions];
      
      if (partial.length > 0) {
        allSuggestions = allSuggestions.filter(suggestion =>
          suggestion.toLowerCase().includes(partial.toLowerCase())
        );
      }

      // Limit to 10 suggestions
      allSuggestions = allSuggestions.slice(0, 10);

      return successResponse(res, 200, {
        suggestions: allSuggestions,
        partial,
        metadata: {
          totalAvailable: allSuggestions.length
        }
      }, 'Suggestions retrieved successfully');

    } catch (error) {
      console.error('Error in getQuerySuggestions:', error);
      return errorResponse(res, 500, {
        code: 'SUGGESTIONS_ERROR',
        message: 'Failed to get query suggestions'
      });
    }
  }
};