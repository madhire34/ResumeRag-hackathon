import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import openaiService from './openaiService.js';

export const resumeParsingService = {
  // Extract text from PDF file
  async extractTextFromPDF(filePath) {
    try {
      console.log(`📄 Extracting text from PDF: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('PDF file not found');
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      console.log(`✅ Extracted ${pdfData.text.length} characters from PDF`);
      return {
        text: pdfData.text.trim(),
        numPages: pdfData.numpages,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate
        }
      };

    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  },

  // Extract structured data from resume text using OpenAI
  async extractStructuredData(text) {
    try {
      console.log('🤖 Extracting structured data using OpenAI...');

      const extractionPrompt = `
You are an expert resume parser. Extract structured information from the following resume text and return ONLY valid JSON with no additional text.

Resume text:
${text}

Return JSON in this exact format:
{
  "personalInfo": {
    "name": "Full Name or null",
    "email": "email@example.com or null", 
    "phone": "phone number or null",
    "address": "full address or null",
    "linkedIn": "LinkedIn URL or null",
    "github": "GitHub URL or null",
    "portfolio": "Portfolio URL or null"
  },
  "skills": [
    {
      "name": "Skill Name",
      "category": "technical|soft|language|certification", 
      "proficiency": "beginner|intermediate|advanced|expert"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title", 
      "location": "City, State/Country",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or present",
      "description": "Job description",
      "achievements": ["Achievement 1", "Achievement 2"],
      "technologies": ["Tech 1", "Tech 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "gpa": "GPA or null",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "achievements": ["Achievement 1"]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization", 
      "issueDate": "YYYY-MM",
      "expiryDate": "YYYY-MM or null",
      "credentialId": "ID or null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["Tech 1", "Tech 2"],
      "url": "Project URL or null",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null"
    }
  ],
  "languages": [
    {
      "name": "Language Name",
      "proficiency": "native|fluent|intermediate|basic"
    }
  ]
}

Important: 
- Use null for missing fields, not empty strings
- Be as accurate as possible with dates
- Categorize skills appropriately  
- Extract all relevant technologies and achievements
- Return ONLY the JSON object, no other text`;

      const response = await openaiService.client.chat.completions.create({
        messages: [{ role: 'user', content: extractionPrompt }],
        model: 'gpt-4',
        temperature: 0.1,
        max_tokens: 2000
      });

      const extractedText = response.choices[0].message.content.trim();
      
      // Clean up any potential markdown formatting
      const cleanedText = extractedText.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        const structuredData = JSON.parse(cleanedText);
        console.log('✅ Successfully extracted structured data');
        return structuredData;
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', extractedText);
        
        // Fallback: return basic structure with available text
        return this.getFallbackStructuredData(text);
      }

    } catch (error) {
      console.error('Error extracting structured data:', error);
      return this.getFallbackStructuredData(text);
    }
  },

  // Generate embeddings for resume text
  async generateEmbedding(text) {
    try {
      console.log('🔢 Generating embeddings for resume...');
      
      // Truncate text if too long (OpenAI embedding limit is ~8k tokens)
      const maxLength = 6000; // Conservative limit
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...'
        : text;

      const embedding = await openaiService.generateEmbedding(truncatedText);
      
      console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
      return embedding;

    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  },

  // Extract PII from structured data
  extractPersonalInfo(structuredData) {
    try {
      const personalInfo = structuredData.personalInfo || {};
      
      return {
        name: personalInfo.name,
        email: personalInfo.email,
        phone: personalInfo.phone,
        address: personalInfo.address,
        dateOfBirth: null, // Will be extracted from text if available
        linkedIn: personalInfo.linkedIn,
        github: personalInfo.github,
        portfolio: personalInfo.portfolio
      };
    } catch (error) {
      console.error('Error extracting personal info:', error);
      return {};
    }
  },

  // Redact PII from text
  redactPIIFromText(text, personalInfo = {}) {
    try {
      let redactedText = text;

      // Redact email addresses
      if (personalInfo.email) {
        const emailRegex = new RegExp(personalInfo.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        redactedText = redactedText.replace(emailRegex, '[EMAIL REDACTED]');
      }
      
      // Generic email redaction
      redactedText = redactedText.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL REDACTED]');

      // Redact phone numbers
      if (personalInfo.phone) {
        const phoneRegex = new RegExp(personalInfo.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        redactedText = redactedText.replace(phoneRegex, '[PHONE REDACTED]');
      }
      
      // Generic phone redaction
      redactedText = redactedText.replace(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE REDACTED]');

      // Redact addresses (simplified pattern)
      redactedText = redactedText.replace(/\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Way|Place|Pl)[\w\s,]*\d{5}/gi, '[ADDRESS REDACTED]');

      // Redact SSN
      redactedText = redactedText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN REDACTED]');

      // Redact potential names (if provided)
      if (personalInfo.name) {
        const nameParts = personalInfo.name.split(/\s+/);
        nameParts.forEach(namePart => {
          if (namePart.length > 2) {
            const nameRegex = new RegExp(`\\b${namePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            redactedText = redactedText.replace(nameRegex, '[NAME REDACTED]');
          }
        });
      }

      return redactedText;

    } catch (error) {
      console.error('Error redacting PII:', error);
      return text; // Return original text if redaction fails
    }
  },

  // Fallback structured data when AI extraction fails
  getFallbackStructuredData(text) {
    console.log('⚠️ Using fallback structured data extraction');
    
    // Simple regex-based extraction as fallback
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    
    // Extract potential skills (common programming languages and technologies)
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS', 
      'Git', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'MongoDB', 'PostgreSQL',
      'Linux', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'Angular', 'Vue.js', 'Django', 'Flask', 'Spring', 'Express', 'GraphQL'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
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
        address: null,
        linkedIn: null,
        github: null,
        portfolio: null
      },
      skills: foundSkills,
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: []
    };
  },

  // Process complete resume file
  async processResumeFile(filePath, originalName) {
    try {
      console.log(`🚀 Starting complete resume processing for: ${originalName}`);
      
      const startTime = Date.now();
      
      // Step 1: Extract text from PDF
      const { text, numPages, metadata } = await this.extractTextFromPDF(filePath);
      
      if (text.length < 100) {
        throw new Error('Resume text too short - may not be a valid resume');
      }

      // Step 2: Extract structured data using AI
      const structuredData = await this.extractStructuredData(text);
      
      // Step 3: Extract and redact PII
      const personalInfo = this.extractPersonalInfo(structuredData);
      const redactedText = this.redactPIIFromText(text, personalInfo);
      
      // Step 4: Generate embeddings
      const embedding = await this.generateEmbedding(text);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Resume processing completed in ${processingTime}ms`);
      
      return {
        text,
        redactedText,
        personalInfo,
        extractedData: structuredData,
        embedding,
        textLength: text.length,
        numPages,
        metadata: {
          ...metadata,
          processingTime,
          extractionMethod: 'openai-gpt4'
        }
      };

    } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
    }
  },

  // Validate resume file
  validateResumeFile(file) {
    const errors = [];
    
    // Check file type
    if (file.mimetype !== 'application/pdf') {
      errors.push('Only PDF files are supported');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }
    
    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};