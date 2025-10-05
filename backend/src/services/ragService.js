import Resume from '../models/Resume.js';
import aiService from './aiService.js';
import mongoose from 'mongoose';

const ragService = {
  // Find similar resumes using vector search (cosine similarity)
  async findSimilarResumes(queryEmbedding, k = 5, filterCriteria = {}, userRole = 'candidate') {
    try {
      console.log(`🔍 Performing vector search for ${k} similar resumes...`);
      
      if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error('Invalid query embedding provided');
      }

      // Build the aggregation pipeline
      const pipeline = [
        // Match basic criteria
        { $match: filterCriteria },
        
        // Add similarity score field
        {
          $addFields: {
            similarity: {
              $let: {
                vars: {
                  dotProduct: {
                    $reduce: {
                      input: { $range: [0, { $size: "$embedding" }] },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $multiply: [
                              { $arrayElemAt: ["$embedding", "$$this"] },
                              { $arrayElemAt: [queryEmbedding, "$$this"] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  normA: {
                    $sqrt: {
                      $reduce: {
                        input: "$embedding",
                        initialValue: 0,
                        in: { $add: ["$$value", { $multiply: ["$$this", "$$this"] }] }
                      }
                    }
                  },
                  normB: Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0))
                },
                in: {
                  $cond: {
                    if: { $and: [{ $gt: ["$$normA", 0] }, { $gt: ["$$normB", 0] }] },
                    then: { $divide: ["$$dotProduct", { $multiply: ["$$normA", "$$normB"] }] },
                    else: 0
                  }
                }
              }
            }
          }
        },
        
        // Filter out low similarity scores
        { $match: { similarity: { $gte: 0.1 } } },
        
        // Sort by similarity (descending)
        { $sort: { similarity: -1 } },
        
        // Limit results
        { $limit: k },
        
        // Populate user data if needed
        {
          $lookup: {
            from: 'users',
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploadedBy'
          }
        },
        { $unwind: '$uploadedBy' }
      ];

      const results = await Resume.aggregate(pipeline);
      
      // Apply PII filtering based on user role
      const processedResults = results.map(resume => {
        if (userRole !== 'recruiter' && userRole !== 'admin') {
          // Hide PII for non-recruiters
          delete resume.personalInfo;
          resume.text = resume.redactedText;
        }
        delete resume.redactedText; // Remove redundant field
        return resume;
      });

      console.log(`✅ Found ${processedResults.length} similar resumes`);
      return processedResults;

    } catch (error) {
      console.error('Error in findSimilarResumes:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  },

  // Generate contextual answer using RAG
  async generateAnswer(query, similarResumes, jobContext = '') {
    try {
      console.log('🤖 Generating RAG answer...');

      if (!similarResumes || similarResumes.length === 0) {
        return "I couldn't find any relevant resumes to answer your question.";
      }

      // Prepare context from similar resumes
      const context = similarResumes.map((resume, index) => {
        const skills = resume.extractedData?.skills?.slice(0, 10).map(s => s.name).join(', ') || 'Not specified';
        const experience = resume.extractedData?.experience?.map(exp => 
          `${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate})`
        ).slice(0, 3).join(', ') || 'Not specified';
        
        const education = resume.extractedData?.education?.map(edu =>
          `${edu.degree} in ${edu.field} from ${edu.institution}`
        ).slice(0, 2).join(', ') || 'Not specified';

        return `
Resume ${index + 1}:
- Years of Experience: ${resume.yearsOfExperience || 0}
- Current Position: ${resume.currentPosition || 'Not specified'}
- Key Skills: ${skills}
- Work Experience: ${experience}
- Education: ${education}
- Relevant Text Excerpt: ${this.extractRelevantSnippet(resume, query, 300)}
`;
      }).join('\n');

      const ragPrompt = `
You are an AI assistant helping with resume analysis and candidate search. Based on the provided resume data, answer the user's query in a helpful and accurate manner.

User Query: "${query}"

Available Resume Data:
${context}
${jobContext}

Instructions:
1. Answer the query directly and concisely
2. Cite specific evidence from the resumes when making claims
3. If comparing candidates, be fair and highlight different strengths
4. Use professional, recruiter-friendly language
5. If the query asks for specific numbers or counts, provide them accurately
6. Mention relevant skills, experience, and qualifications
7. If no perfect matches exist, suggest the closest alternatives

Provide a comprehensive answer that would be useful for a recruiter or hiring manager:`;

      // Use aiService to generate answer
      const resumeContexts = similarResumes.map((resume, index) => ({
        id: resume._id,
        text: resume.text || resume.redactedText || '',
        personalInfo: resume.personalInfo,
        similarity: resume.similarity
      }));

      const aiResponse = await aiService.answerQuestion(query, resumeContexts, similarResumes.length);

      const answer = aiResponse.answer || "Unable to generate answer.";
      console.log('✅ RAG answer generated successfully');
      
      return answer;

    } catch (error) {
      console.error('Error generating RAG answer:', error);
      return `I apologize, but I encountered an error while analyzing the resumes. Here's what I found based on the available data: ${similarResumes.length} relevant resume${similarResumes.length !== 1 ? 's' : ''} matched your query.`;
    }
  },

  // Extract relevant snippet from resume text
  extractRelevantSnippet(resume, query, maxLength = 200) {
    try {
      const text = resume.text || resume.redactedText || '';
      if (!text || text.length === 0) {
        return 'No text content available';
      }

      // Simple keyword-based relevance extraction
      const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      if (sentences.length === 0) {
        return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
      }

      // Score sentences based on query word matches
      const scoredSentences = sentences.map(sentence => {
        const lowerSentence = sentence.toLowerCase();
        const score = queryWords.reduce((acc, word) => {
          const matches = (lowerSentence.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
          return acc + matches;
        }, 0);
        
        return { sentence: sentence.trim(), score };
      });

      // Sort by score and get top sentences
      scoredSentences.sort((a, b) => b.score - a.score);
      
      let snippet = '';
      let currentLength = 0;
      
      for (const scored of scoredSentences) {
        if (scored.score > 0 && currentLength + scored.sentence.length < maxLength) {
          snippet += (snippet ? ' ' : '') + scored.sentence;
          currentLength += scored.sentence.length;
        }
      }

      // Fallback to beginning of text if no relevant sentences found
      if (!snippet) {
        snippet = text.substring(0, maxLength);
      }

      return snippet + (snippet.length < text.length ? '...' : '');

    } catch (error) {
      console.error('Error extracting snippet:', error);
      return 'Error extracting relevant content';
    }
  },

  // Semantic search with filters
  async semanticSearchWithFilters(queryEmbedding, filters = {}, limit = 20) {
    try {
      console.log('🔍 Performing semantic search with filters...');

      let matchCriteria = { status: 'completed' };

      // Apply skill filters
      if (filters.skills && filters.skills.length > 0) {
        matchCriteria['extractedData.skills.name'] = {
          $in: filters.skills.map(skill => new RegExp(skill, 'i'))
        };
      }

      // Apply experience level filters
      if (filters.experienceLevel) {
        const expMapping = {
          'entry': { $gte: 0, $lt: 2 },
          'mid': { $gte: 2, $lt: 5 },
          'senior': { $gte: 5, $lt: 8 },
          'lead': { $gte: 8, $lt: 12 },
          'executive': { $gte: 12 }
        };
        matchCriteria.yearsOfExperience = expMapping[filters.experienceLevel];
      }

      // Apply location filters
      if (filters.location) {
        matchCriteria.location = new RegExp(filters.location, 'i');
      }

      // Apply education filters
      if (filters.education) {
        matchCriteria['extractedData.education.degree'] = new RegExp(filters.education, 'i');
      }

      // Apply company filters
      if (filters.companies && filters.companies.length > 0) {
        matchCriteria['extractedData.experience.company'] = {
          $in: filters.companies.map(company => new RegExp(company, 'i'))
        };
      }

      return await this.findSimilarResumes(queryEmbedding, limit, matchCriteria);

    } catch (error) {
      console.error('Error in semantic search with filters:', error);
      throw error;
    }
  },

  // Find candidates for specific job requirements
  async findCandidatesForJob(jobRequirements, jobSkills = [], k = 10) {
    try {
      console.log('👥 Finding candidates for job requirements...');

      // Generate embedding for job requirements
      const jobText = `${jobRequirements} Required skills: ${jobSkills.join(', ')}`;
      const jobEmbedding = await openaiService.generateEmbedding(jobText);

      // Find similar candidates
      const candidates = await this.findSimilarResumes(jobEmbedding, k * 2); // Get more for filtering

      // Score candidates based on skill matches
      const scoredCandidates = candidates.map(candidate => {
        const candidateSkills = candidate.extractedData?.skills?.map(s => s.name.toLowerCase()) || [];
        const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
        
        const matchedSkills = jobSkillsLower.filter(jobSkill =>
          candidateSkills.some(candidateSkill =>
            candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill)
          )
        );

        const skillMatchScore = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0;
        const combinedScore = (candidate.similarity * 0.6) + (skillMatchScore * 0.4);

        return {
          ...candidate,
          skillMatchScore,
          matchedSkills,
          missingSkills: jobSkillsLower.filter(skill => !matchedSkills.includes(skill)),
          combinedScore
        };
      });

      // Sort by combined score and return top k
      scoredCandidates.sort((a, b) => b.combinedScore - a.combinedScore);
      return scoredCandidates.slice(0, k);

    } catch (error) {
      console.error('Error finding candidates for job:', error);
      throw error;
    }
  },

  // Track query for analytics
  async trackQuery(userId, query, resultCount) {
    try {
      // Simple query tracking - could be expanded to a separate analytics collection
      console.log(`📊 Query tracked: "${query}" by user ${userId}, ${resultCount} results`);
      
      // In a production system, you might want to:
      // 1. Store queries in a separate analytics collection
      // 2. Track query performance metrics
      // 3. Analyze popular search patterns
      // 4. Implement query suggestions based on history
      
      return true;
    } catch (error) {
      console.error('Error tracking query:', error);
      // Don't throw error for analytics failure
      return false;
    }
  },

  // Get search analytics and insights
  async getSearchAnalytics(userId, timeframe = '30d') {
    try {
      // This would typically aggregate query data
      // For now, return basic stats from resume collection
      
      const totalResumes = await Resume.countDocuments({ status: 'completed' });
      const recentResumes = await Resume.countDocuments({
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      // Get skill distribution
      const skillStats = await Resume.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$extractedData.skills' },
        { $group: { _id: '$extractedData.skills.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      // Get experience level distribution
      const experienceStats = await Resume.aggregate([
        { $match: { status: 'completed', yearsOfExperience: { $exists: true } } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lt: ['$yearsOfExperience', 2] }, then: 'entry' },
                  { case: { $lt: ['$yearsOfExperience', 5] }, then: 'mid' },
                  { case: { $lt: ['$yearsOfExperience', 8] }, then: 'senior' },
                  { case: { $lt: ['$yearsOfExperience', 12] }, then: 'lead' }
                ],
                default: 'executive'
              }
            },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        totalResumes,
        recentResumes,
        skillDistribution: skillStats,
        experienceDistribution: experienceStats,
        timeframe
      };

    } catch (error) {
      console.error('Error getting search analytics:', error);
      return {
        totalResumes: 0,
        recentResumes: 0,
        skillDistribution: [],
        experienceDistribution: [],
        timeframe
      };
    }
  }
};

export { ragService };
