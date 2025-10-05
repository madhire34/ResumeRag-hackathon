import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI, jobAPI } from '../lib/api';
import { Upload, Search, Briefcase, Users, FileText, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Resume } from '../types';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Fetch stats
  const { data: resumesData, isLoading: loadingResumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumeAPI.getList({ limit: 5 }),
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getList({ limit: 5 }),
    enabled: user?.role === 'recruiter' || user?.role === 'admin',
  });

  const stats = {
    resumes: resumesData?.pagination?.total || 0,
    jobs: jobsData?.pagination?.total || 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-primary-100 text-lg">
            {user?.role === 'admin' && 'System Administrator'}
            {user?.role === 'recruiter' && `Recruiter${user?.company ? ` at ${user.company}` : ''}`}
            {user?.role === 'candidate' && 'Job Seeker'}
          </p>
          <p className="text-primary-200 text-sm mt-1">
            AI-powered resume management and candidate matching platform
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Resumes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loadingResumes ? '...' : stats.resumes}
              </p>
            </div>
          </div>
        </div>
        
        {(user?.role === 'recruiter' || user?.role === 'admin') && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loadingJobs ? '...' : stats.jobs}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Matches</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload Resumes Card */}
        <Link to="/upload" className="block group">
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-6 rounded-lg border-2 border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <ArrowRight className="h-5 w-5 text-primary-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <h3 className="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">
              Upload Resumes
            </h3>
            <p className="text-primary-700 dark:text-primary-300 mb-4">
              Upload PDF resumes for AI-powered parsing and analysis. Drag & drop supported.
            </p>
            <div className="flex items-center text-sm text-primary-600 dark:text-primary-400">
              <span className="font-medium">Start uploading →</span>
            </div>
          </div>
        </Link>
        
        {/* Search Candidates Card */}
        <Link to="/search" className="block group">
          <div className="bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 p-6 rounded-lg border-2 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <Search className="h-8 w-8 text-green-600 dark:text-green-400" />
              <ArrowRight className="h-5 w-5 text-green-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
              AI Search
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Use natural language queries to find perfect candidates with semantic search.
            </p>
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <Sparkles className="h-4 w-4 mr-1" />
              <span className="font-medium">Try AI search →</span>
            </div>
          </div>
        </Link>
        
        {/* Manage Jobs Card - Only for recruiters/admins */}
        {(user?.role === 'recruiter' || user?.role === 'admin') && (
          <Link to="/jobs" className="block group">
            <div className="bg-gradient-to-r from-blue-50 to-sky-100 dark:from-blue-900/20 dark:to-sky-800/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg group-hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-4">
                <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <ArrowRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                Manage Jobs
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-4">
                Create job postings and find the best candidates using AI matching.
              </p>
              <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                <span className="font-medium">Manage jobs →</span>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Resumes */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recently Uploaded Resumes
            </h3>
            {loadingResumes ? (
              <LoadingSpinner size="sm" message="Loading resumes..." />
            ) : (
              <div className="space-y-3">
                {resumesData?.data && resumesData.data.length > 0 ? (
                  resumesData.data.slice(0, 3).map((resume: Resume) => (
                    <div key={resume._id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <FileText className="h-8 w-8 text-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {resume.originalName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(resume.createdAt).toLocaleDateString()}
                          {resume.personalInfo?.name && (
                            <span> • {resume.personalInfo.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No resumes uploaded yet. <Link to="/upload" className="text-primary-600 hover:text-primary-500">Upload your first resume</Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Quick AI Search
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Try these popular searches:
              </p>
              <div className="space-y-2">
                <Link 
                  to="/search?q=Find React developers with 5+ years experience"
                  className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    "Find React developers with 5+ years experience"
                  </span>
                </Link>
                <Link 
                  to="/search?q=Who has machine learning experience?"
                  className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    "Who has machine learning experience?"
                  </span>
                </Link>
                <Link 
                  to="/search?q=Find candidates with AWS certifications"
                  className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    "Find candidates with AWS certifications"
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;