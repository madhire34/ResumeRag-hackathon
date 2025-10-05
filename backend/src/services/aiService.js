import openaiService from './openaiService.js';
import ollamaService from './ollamaService.js';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'auto'; // 'openai', 'ollama', or 'auto'
    this.activeService = null;
  }

  async initialize() {
    if (this.provider === 'ollama') {
      console.log('🦙 Using Ollama as AI provider');
      this.activeService = ollamaService;
      return;
    }

    if (this.provider === 'openai') {
      console.log('🤖 Using OpenAI as AI provider');
      this.activeService = openaiService;
      return;
    }

    // Auto mode - try OpenAI first, fallback to Ollama
    console.log('🔄 Auto-detecting AI provider...');
    
    // Check if OpenAI key exists and is valid
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_VALID_OPENAI_API_KEY_HERE') {
      try {
        // Try a quick test with OpenAI
        const testEmbedding = await openaiService.generateEmbedding('test');
        if (testEmbedding && testEmbedding.length > 0) {
          console.log('✅ OpenAI is available and working');
          this.activeService = openaiService;
          return;
        }
      } catch (error) {
        console.log('⚠️  OpenAI not available, checking Ollama...');
      }
    }

    // Try Ollama
    const ollamaAvailable = await ollamaService.checkAvailability();
    if (ollamaAvailable) {
      console.log('✅ Ollama is available and working');
      this.activeService = ollamaService;
      return;
    }

    // No AI service available
    console.error('❌ No AI service available! Please configure OpenAI or install Ollama');
    this.activeService = ollamaService; // Use fallback mode
  }

  async generateEmbedding(text, maxLength = 8000) {
    if (!this.activeService) {
      await this.initialize();
    }
    return this.activeService.generateEmbedding(text, maxLength);
  }

  async extractResumeData(resumeText) {
    if (!this.activeService) {
      await this.initialize();
    }
    return this.activeService.extractResumeData(resumeText);
  }

  async answerQuestion(query, resumeContexts, maxResumes = 5) {
    if (!this.activeService) {
      await this.initialize();
    }
    return this.activeService.answerQuestion(query, resumeContexts, maxResumes);
  }

  calculateCosineSimilarity(vecA, vecB) {
    return openaiService.calculateCosineSimilarity(vecA, vecB);
  }

  getActiveProvider() {
    if (!this.activeService) {
      return 'none';
    }
    return this.activeService === openaiService ? 'openai' : 'ollama';
  }
}

export default new AIService();
