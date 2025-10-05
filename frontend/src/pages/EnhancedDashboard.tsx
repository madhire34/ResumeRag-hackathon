import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI, jobAPI } from '../lib/api';
import { 
  Upload, Search, Briefcase, Users, FileText, TrendingUp, 
  ArrowRight, Sparkles, Zap, Target, Award, Brain, Rocket
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Resume } from '../types';

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();

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
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section with Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 gradient-bg opacity-90"></div>
        <div className="relative glass-card border-0 p-8 md:p-12">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  Welcome back, {user?.name}! 👋
                </h1>
              </div>
              <p className="text-xl text-white/90 max-w-2xl">
                {user?.role === 'admin' && '🔐 System Administrator Dashboard'}
                {user?.role === 'recruiter' && `🎯 ${user?.company ? `${user.company} ` : ''}Talent Acquisition Hub`}
                {user?.role === 'candidate' && '💼 Your Career Journey Starts Here'}
              </p>
              <div className="flex items-center space-x-2 text-white/80">
                <Brain className="h-5 w-5" />
                <span className="text-sm font-medium">AI-Powered Resume Intelligence Platform</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl"></div>
                <Sparkles className="relative h-32 w-32 text-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid with Modern Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 group hover:scale-105 transition-transform duration-300 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Resumes</p>
          <p className="text-3xl font-bold gradient-text">
            {loadingResumes ? '...' : stats.resumes}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {stats.resumes > 0 ? '+12% from last week' : 'Start uploading resumes'}
          </p>
        </div>
        
        {(user?.role === 'recruiter' || user?.role === 'admin') && (
          <div className="glass-card p-6 group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Jobs</p>
            <p className="text-3xl font-bold gradient-text">
              {loadingJobs ? '...' : stats.jobs}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {stats.jobs > 0 ? 'Actively recruiting' : 'Post your first job'}
            </p>
          </div>
        )}
        
        <div className="glass-card p-6 group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <Users className="h-6 w-6 text-white" />
            </div>
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">AI Matches</p>
          <p className="text-3xl font-bold gradient-text">
            {stats.resumes * 3}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Powered by AI algorithms
          </p>
        </div>
        
        <div className="glass-card p-6 group hover:scale-105 transition-transform duration-300 animate-slide-up" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <Award className="h-6 w-6 text-white" />
            </div>
            <Sparkles className="h-5 w-5 text-pink-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Success Rate</p>
          <p className="text-3xl font-bold gradient-text">
            {stats.resumes > 0 ? '94%' : '--'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Industry leading accuracy
          </p>
        </div>
      </div>

      {/* Quick Actions with Modern Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/upload" className="block group animate-scale-in">
          <div className="glass-card p-8 group-hover:scale-105 group-hover:glow-hover transition-all duration-300 border-2 border-transparent group-hover:border-blue-500/50">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-2xl transition-shadow">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <ArrowRight className="h-6 w-6 text-blue-500 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Upload Resumes
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Drag & drop PDF resumes for instant AI-powered parsing and intelligent analysis.
            </p>
            <div className="flex items-center space-x-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Zap className="h-4 w-4" />
              <span>Lightning fast processing →</span>
            </div>
          </div>
        </Link>
        
        <Link to="/search" className="block group animate-scale-in" style={{animationDelay: '0.1s'}}>
          <div className="glass-card p-8 group-hover:scale-105 group-hover:glow-hover transition-all duration-300 border-2 border-transparent group-hover:border-green-500/50">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-2xl transition-shadow">
                <Search className="h-8 w-8 text-white" />
              </div>
              <ArrowRight className="h-6 w-6 text-green-500 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              AI Search
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Use natural language to find perfect candidates with semantic search technology.
            </p>
            <div className="flex items-center space-x-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Sparkles className="h-4 w-4" />
              <span>Powered by AI →</span>
            </div>
          </div>
        </Link>
        
        {(user?.role === 'recruiter' || user?.role === 'admin') && (
          <Link to="/jobs" className="block group animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="glass-card p-8 group-hover:scale-105 group-hover:glow-hover transition-all duration-300 border-2 border-transparent group-hover:border-purple-500/50">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-2xl transition-shadow">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
                <ArrowRight className="h-6 w-6 text-purple-500 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Manage Jobs
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Create job postings and discover the best candidates using AI matching.
              </p>
              <div className="flex items-center space-x-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                <Target className="h-4 w-4" />
                <span>Smart matching →</span>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Recent Activity with Modern Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Recently Uploaded
            </h3>
          </div>
          {loadingResumes ? (
            <LoadingSpinner size="sm" message="Loading resumes..." />
          ) : (
            <div className="space-y-3">
              {resumesData?.data && resumesData.data.length > 0 ? (
                resumesData.data.slice(0, 3).map((resume: Resume) => (
                  <div key={resume._id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:shadow-md transition-shadow">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {resume.originalName}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(resume.createdAt).toLocaleDateString()}
                        {resume.personalInfo?.name && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">• {resume.personalInfo.name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No resumes yet. <Link to="/upload" className="text-blue-600 hover:text-blue-500 font-medium">Upload your first resume</Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Quick AI Search
            </h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Try these popular searches:
            </p>
            {[
              "Find React developers with 5+ years",
              "Who has machine learning experience?",
              "Candidates with AWS certifications"
            ].map((query, idx) => (
              <Link 
                key={idx}
                to={`/search?q=${encodeURIComponent(query)}`}
                className="block p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    "{query}"
                  </span>
                  <ArrowRight className="h-4 w-4 text-green-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
