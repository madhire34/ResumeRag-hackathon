export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'candidate';
  company?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface Resume {
  _id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string | User;
  text?: string;
  redactedText?: string;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedIn?: string;
    github?: string;
    portfolio?: string;
  };
  extractedData?: {
    skills: Array<{
      name: string;
      category: string;
      proficiency: string;
    }>;
    experience: Array<{
      company: string;
      position: string;
      location?: string;
      startDate: string;
      endDate: string;
      description?: string;
      achievements?: string[];
      technologies?: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      gpa?: string;
      startDate: string;
      endDate: string;
      achievements?: string[];
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate?: string;
      credentialId?: string;
    }>;
    projects: Array<{
      name: string;
      description: string;
      technologies: string[];
      url?: string;
      startDate: string;
      endDate?: string;
    }>;
    languages: Array<{
      name: string;
      proficiency: string;
    }>;
  };
  yearsOfExperience: number;
  currentPosition?: string;
  currentCompany?: string;
  location?: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  _id: string;
  title: string;
  company: string;
  department?: string;
  location: string;
  remoteType: 'on-site' | 'remote' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  description: string;
  responsibilities?: string[];
  requirements: string[];
  preferredQualifications?: string[];
  skills?: Array<{
    name: string;
    level: string;
    required: boolean;
  }>;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  benefits?: string[];
  status: 'draft' | 'active' | 'paused' | 'closed' | 'cancelled';
  postedBy: string | User;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RAGQuery {
  query: string;
  k?: number;
  includeJobContext?: boolean;
  filters?: {
    skills?: string[];
    experienceLevel?: string;
    location?: string;
    education?: string;
    companies?: string[];
  };
}

export interface RAGResponse {
  query: string;
  answer: string;
  sources: Array<{
    resumeId: string;
    similarity: number;
    snippet: string;
    candidateName: string;
    currentPosition?: string;
    yearsOfExperience: number;
    keySkills: string[];
  }>;
  totalResults: number;
  filters?: any;
  metadata: {
    processingTime: number;
    model: string;
    embeddingModel: string;
  };
}

export interface JobMatch {
  resumeId: string;
  candidateName: string;
  filename: string;
  overallScore: number;
  semanticSimilarity: number;
  skillsMatch: number;
  experienceMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
  evidence: string[];
  yearsOfExperience: number;
  currentPosition?: string;
  uploadedAt: string;
}

export interface JobMatchResponse {
  jobId: string;
  jobTitle: string;
  company: string;
  matches: JobMatch[];
  totalCandidates: number;
  matchingCriteria: {
    skillsMatch: string;
    experienceMatch: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    next_offset?: number | null;
  };
  message: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
}

export interface APIError {
  error: {
    code: string;
    field?: string;
    message: string;
  };
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  resumeId?: string;
  error?: string;
}