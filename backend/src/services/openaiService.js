import OpenAI from 'openai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

class OpenAIService {
  constructor() {
    // Initialize client lazily to ensure env vars are loaded
    this._client = null;
    this.isAvailable = true;
  }
  
  get client() {
    if (!this._client) {
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY is not set in environment variables');
        throw new Error('OpenAI API key is required');
      }
      this._client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this._client;
  }

  async generateEmbedding(text, maxLength = 8000) {
    try {
      const truncatedText = text.substring(0, maxLength);
      
      const response = await this.client.embeddings.create({
        model: "text-embedding-ada-002",
        input: truncatedText,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ OpenAI embedding error:', error.message);
      console.error('Error details:', {
        status: error.status,
        type: error.type,
        code: error.code
      });
      if (error.status === 429) {
        console.warn('⚠️  OpenAI rate limit exceeded, returning empty embedding');
        this.isAvailable = false;
        setTimeout(() => { this.isAvailable = true; }, 60000); // Reset after 1 minute
      } else if (error.status === 401) {
        console.error('🔑 Invalid OpenAI API key! Please check your OPENAI_API_KEY in .env file');
      }
      return [];
    }
  }

  async extractResumeData(resumeText) {
    try {
      const prompt = `
        Extract structured information from this resume text and return a JSON object with the following structure:
        {
          "personalInfo": {
            "name": "Full name",
            "email": "Email address",
            "phone": "Phone number",
            "linkedIn": "LinkedIn URL",
            "github": "GitHub URL",
            "portfolio": "Portfolio URL"
          },
          "skills": [
            {
              "name": "Skill name",
              "category": "technical|soft|language|other",
              "proficiency": "beginner|intermediate|advanced|expert"
            }
          ],
          "experience": [
            {
              "company": "Company name",
              "position": "Job title",
              "location": "Location",
              "startDate": "YYYY-MM or YYYY",
              "endDate": "YYYY-MM or YYYY or present",
              "description": "Job description",
              "achievements": ["Achievement 1", "Achievement 2"],
              "technologies": ["Tech 1", "Tech 2"]
            }
          ],
          "education": [
            {
              "institution": "School/University name",
              "degree": "Degree type",
              "field": "Field of study",
              "gpa": "GPA if mentioned",
              "startDate": "YYYY",
              "endDate": "YYYY",
              "achievements": ["Achievement 1", "Achievement 2"]
            }
          ],
          "certifications": [
            {
              "name": "Certification name",
              "issuer": "Issuing organization",
              "issueDate": "YYYY-MM",
              "expiryDate": "YYYY-MM",
              "credentialId": "ID if provided"
            }
          ],
          "projects": [
            {
              "name": "Project name",
              "description": "Project description",
              "technologies": ["Tech 1", "Tech 2"],
              "url": "Project URL if available",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM"
            }
          ],
          "languages": [
            {
              "name": "Language name",
              "proficiency": "native|fluent|intermediate|basic"
            }
          ]
        }

        Only include information that is explicitly mentioned in the resume. If a field is not found, use null or empty array as appropriate.
        
        Resume text:
        ${resumeText.substring(0, 4000)}
      `;

      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract structured information from resumes and return valid JSON only. Be accurate and only include information that is explicitly stated."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ OpenAI resume parsing error:', error.message);
      console.error('Using fallback parser...');
      return this.getFallbackResumeData(resumeText);
    }
  }

  async answerQuestion(query, resumeContexts, maxResumes = 5) {
    try {
      const topResumes = resumeContexts.slice(0, maxResumes);
      const contextText = topResumes.map((resume, index) => 
        `Resume ${index + 1}: ${resume.text.substring(0, 1000)}...`
      ).join('\n\n');

      const prompt = `
        Based on the following resume database, answer the user's question. Provide specific evidence from the resumes to support your answer.
        
        Question: ${query}
        
        Resume Database:
        ${contextText}
        
        Please provide:
        1. A direct answer to the question
        2. Specific evidence from relevant resumes (include resume numbers)
        3. If multiple candidates are relevant, rank them and explain why
        
        Format your response to be helpful and specific.
      `;

      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that analyzes resume databases to answer questions about candidates. Always provide specific evidence and cite which resume(s) your information comes from."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const answer = response.choices[0].message.content;
      
      // Extract evidence and create structured response
      const evidence = topResumes.map((resume, index) => ({
        resumeId: resume.id,
        candidateName: resume.personalInfo?.name || 'Unknown',
        relevantText: resume.text.substring(0, 200) + '...',
        score: resume.similarity || 0
      }));

      return {
        answer,
        evidence,
        sources: topResumes.length,
        query
      };
    } catch (error) {
      console.error('OpenAI question answering error:', error.message);
      return {
        answer: "I'm unable to process your question at the moment due to AI service limitations. Please try again later.",
        evidence: [],
        sources: 0,
        query
      };
    }
  }

  getFallbackResumeData(resumeText) {
    console.log('📝 Using fallback resume parser (regex-based)');
    // Simple regex-based extraction as fallback
    const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = resumeText.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const linkedInMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
    const githubMatch = resumeText.match(/github\.com\/[\w-]+/i);

    // Extract skills (simple keyword matching)
    const skillKeywords = [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
      'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git'
    ];

    const foundSkills = skillKeywords.filter(skill => 
      resumeText.toLowerCase().includes(skill.toLowerCase())
    ).map(skill => ({
      name: skill,
      category: 'technical',
      proficiency: 'intermediate'
    }));

    return {
      personalInfo: {
        name: null,
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        linkedIn: linkedInMatch ? 'https://' + linkedInMatch[0] : null,
        github: githubMatch ? 'https://' + githubMatch[0] : null,
        portfolio: null
      },
      skills: foundSkills,
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: []
    };
  }

  calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
      return 0;
    }

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
  }
}

export default new OpenAIService();
