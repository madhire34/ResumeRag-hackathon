import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  AuthResponse,
  Resume,
  Job,
  RAGQuery,
  RAGResponse,
  JobMatchResponse,
  PaginatedResponse,
  APIResponse,
  APIError,
} from '../types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and idempotency key
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add idempotency key for POST requests
    if (config.method === 'post') {
      config.headers['Idempotency-Key'] = uuidv4();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Utility function to handle API errors
export const handleApiError = (error: any): APIError => {
  if (error.response?.data?.error) {
    return error.response.data as APIError;
  }
  
  return {
    error: {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
    },
  };
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    company?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  getProfile: async (): Promise<APIResponse<User>> => {
    const response = await api.get<APIResponse<User>>('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<APIResponse<User>> => {
    const response = await api.put<APIResponse<User>>('/auth/profile', userData);
    return response.data;
  },
};

// Resume API
export const resumeAPI = {
  upload: async (
    file: File,
    onProgress?: (progressEvent: any) => void
  ): Promise<APIResponse<Resume>> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<APIResponse<Resume>>('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  getList: async (params: {
    limit?: number;
    offset?: number;
    q?: string;
  } = {}): Promise<PaginatedResponse<Resume>> => {
    const response = await api.get<PaginatedResponse<Resume>>('/resumes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<APIResponse<Resume>> => {
    const response = await api.get<APIResponse<Resume>>(`/resumes/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>(`/resumes/${id}`);
    return response.data;
  },
};

// Job API
export const jobAPI = {
  create: async (jobData: Partial<Job>): Promise<APIResponse<Job>> => {
    const response = await api.post<APIResponse<Job>>('/jobs', jobData);
    return response.data;
  },

  getList: async (params: {
    limit?: number;
    offset?: number;
    q?: string;
  } = {}): Promise<PaginatedResponse<Job>> => {
    const response = await api.get<PaginatedResponse<Job>>('/jobs', { params });
    return response.data;
  },

  getById: async (id: string): Promise<APIResponse<Job>> => {
    const response = await api.get<APIResponse<Job>>(`/jobs/${id}`);
    return response.data;
  },

  update: async (id: string, jobData: Partial<Job>): Promise<APIResponse<Job>> => {
    const response = await api.put<APIResponse<Job>>(`/jobs/${id}`, jobData);
    return response.data;
  },

  delete: async (id: string): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>(`/jobs/${id}`);
    return response.data;
  },

  match: async (id: string, topN: number = 10): Promise<APIResponse<JobMatchResponse>> => {
    const response = await api.post<APIResponse<JobMatchResponse>>(`/jobs/${id}/match`, {
      top_n: topN,
    });
    return response.data;
  },
};

// RAG API
export const ragAPI = {
  query: async (queryData: RAGQuery): Promise<APIResponse<RAGResponse>> => {
    const response = await api.post<APIResponse<RAGResponse>>('/ask', queryData);
    return response.data;
  },

  semanticSearch: async (query: string, k: number = 10): Promise<APIResponse<any>> => {
    const response = await api.post<APIResponse<any>>('/ask/semantic', { query, k });
    return response.data;
  },

  getSuggestions: async (partial?: string): Promise<APIResponse<{ suggestions: string[] }>> => {
    const response = await api.post<APIResponse<{ suggestions: string[] }>>('/ask/suggestions', {
      partial,
    });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getUsers: async (params: {
    limit?: number;
    offset?: number;
    q?: string;
  } = {}): Promise<PaginatedResponse<User>> => {
    const response = await api.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<APIResponse<User>> => {
    const response = await api.put<APIResponse<User>>(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>(`/admin/users/${id}`);
    return response.data;
  },

  getStats: async (): Promise<APIResponse<any>> => {
    const response = await api.get<APIResponse<any>>('/admin/stats');
    return response.data;
  },
};

export default api;