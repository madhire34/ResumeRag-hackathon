import axios from 'axios';

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.embeddingModel = 'nomic-embed-text';
    this.chatModel = 'llama3.2';
    this.isAvailable = true;
  }

  async checkAvailability() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, { timeout: 2000 });
      this.isAvailable = response.status === 200;
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      return false;
    }
  }

  async generateEmbedding(text, maxLength = 8000) {
    try {
      const truncatedText = text.substring(0, maxLength);
      
      console.log(`🔢 Generating embedding with Ollama (${this.embeddingModel})...`);
      
      const response = await axios.post(`${this.baseURL}/api/embeddings`, {
        model: this.embeddingModel,
        prompt: truncatedText
      }, {
        timeout: 30000
      });

      if (response.data && response.data.embedding) {
        console.log(`✅ Generated embedding with ${response.data.embedding.length} dimensions`);
        return response.data.embedding;
      }

      throw new Error('No embedding returned from Ollama');
    } catch (error) {
      console.error('❌ Ollama embedding error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('🔴 Ollama is not running! Please start Ollama and run: ollama pull nomic-embed-text');
      }
      
      return [];
    }
  }

  async extractResumeData(resumeText) {
    try {
      const prompt = `Extract structured information from this resume and return ONLY a valid JSON object with this exact structure:
{
  "personalInfo": {
    "name": "Full name or null",
    "email": "Email or null",
    "phone": "Phone or null",
    "linkedIn": "LinkedIn URL or null",
    "github": "GitHub URL or null",
    "portfolio": "Portfolio URL or null"
  },
  "skills": [
    {"name": "Skill name", "category": "technical", "proficiency": "intermediate"}
  ],
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "location": "Location or null",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or present",
      "description": "Brief description",
      "achievements": [],
      "technologies": []
    }
  ],
  "education": [
    {
      "institution": "School name",
      "degree": "Degree type",
      "field": "Field of study",
      "gpa": "GPA or null",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "achievements": []
    }
  ],
  "certifications": [],
  "projects": [],
  "languages": []
}

Resume text:
${resumeText.substring(0, 3000)}

Return ONLY the JSON object, no other text.`;

      console.log('🧠 Extracting resume data with Ollama...');

      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.chatModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 2000
        }
      }, {
        timeout: 60000
      });

      if (response.data && response.data.response) {
        const text = response.data.response.trim();
        
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted resume data');
          return parsed;
        }
      }

      throw new Error('Failed to parse JSON from Ollama response');
    } catch (error) {
      console.error('❌ Ollama resume parsing error:', error.message);
      return this.getFallbackResumeData(resumeText);
    }
  }

  async answerQuestion(query, resumeContexts, maxResumes = 5) {
    try {
      const topResumes = resumeContexts.slice(0, maxResumes);
      const contextText = topResumes.map((resume, index) => 
        `Resume ${index + 1}: ${resume.text.substring(0, 800)}...`
      ).join('\n\n');

      const prompt = `Based on the following resume database, answer the user's question. Provide specific evidence from the resumes.

Question: ${query}

Resume Database:
${contextText}

Provide:
1. A direct answer to the question
2. Specific evidence from relevant resumes (include resume numbers)
3. If multiple candidates are relevant, rank them and explain why

Keep the response concise and helpful.`;

      console.log('🤖 Generating answer with Ollama...');

      const response = await axios.post(`${this.baseURL}/api/generate`, {
        model: this.chatModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1000
        }
      }, {
        timeout: 60000
      });

      const answer = response.data?.response || "Unable to generate answer.";
      
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
      console.error('❌ Ollama question answering error:', error.message);
      return {
        answer: "I'm unable to process your question at the moment. Please ensure Ollama is running.",
        evidence: [],
        sources: 0,
        query
      };
    }
  }

  getFallbackResumeData(resumeText) {
    console.log('📝 Using fallback resume parser (regex-based)');
    const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = resumeText.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const linkedInMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
    const githubMatch = resumeText.match(/github\.com\/[\w-]+/i);

    const skillKeywords = [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
      'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'TypeScript'
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

export default new OllamaService();
