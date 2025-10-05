import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ragAPI, resumeAPI, handleApiError } from '../lib/api';
import { Search, FileText, User, MapPin, Mail, Phone, Sparkles, Clock, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import type { RAGResponse, Resume } from '../types';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RAGResponse | null>(null);

  // Sample queries for suggestions
  const sampleQueries = [
    'Find React developers with 5+ years experience',
    'Who has experience with Python and machine learning?',
    'Find candidates with AWS certifications',
    'Show me frontend developers who know TypeScript',
    'Find data scientists with PhD degrees',
    'Who has worked at startups?'
  ];

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: (searchQuery: string) => ragAPI.query({
      query: searchQuery,
      k: 10 // Number of relevant resumes to retrieve
    }),
    onSuccess: (data) => {
      setSearchResults(data.data);
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      console.error('Search failed:', apiError.error.message);
    },
  });

  // Get resume list for display
  const { data: resumesData } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumeAPI.getList({ limit: 50 }),
  });

  // Handle URL query parameter
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      searchMutation.mutate(urlQuery);
    }
  }, [searchParams]);

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      searchMutation.mutate(finalQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearResults = () => {
    setSearchResults(null);
    setQuery('');
  };

  const formatSkills = (skills: any[]) => {
    if (!skills || skills.length === 0) return 'No skills listed';
    return skills.slice(0, 5).map(skill => skill.name || skill).join(', ') + 
           (skills.length > 5 ? ` +${skills.length - 5} more` : '');
  };

  const formatExperience = (experience: any[]) => {
    if (!experience || experience.length === 0) return 'No experience listed';
    const latestJob = experience[0];
    return `${latestJob.position} at ${latestJob.company}${latestJob.endDate === 'present' ? ' (Current)' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Powered Candidate Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Use natural language queries to find the perfect candidates using AI-powered semantic search and RAG technology.
          </p>
          
          {/* Search Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything about candidates... e.g., 'Find React developers with 5+ years experience'"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                disabled={searchMutation.isPending}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSearch()}
                disabled={!query.trim() || searchMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {searchMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" message="" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>AI Search</span>
                  </>
                )}
              </button>
              
              {searchResults && (
                <button
                  onClick={clearResults}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Clear Results
                </button>
              )}
            </div>
          </div>

          {/* Sample Queries */}
          {!searchResults && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Try these example searches:
              </h3>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((sampleQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(sampleQuery)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    disabled={searchMutation.isPending}
                  >
                    {sampleQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-6">
          {/* AI Answer */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 shadow rounded-lg border border-primary-200 dark:border-primary-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-bold text-primary-900 dark:text-primary-100">
                  AI Analysis
                </h2>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-primary-800 dark:text-primary-200 whitespace-pre-wrap">
                  {searchResults.answer}
                </p>
              </div>
              
              {searchResults.sources && searchResults.sources.length > 0 && (
                <div className="mt-4 flex items-center text-sm text-primary-700 dark:text-primary-300">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Based on analysis of {searchResults.sources.length} resume{searchResults.sources.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Matching Candidates */}
          {searchResults.sources && searchResults.sources.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Matching Candidates ({searchResults.sources.length})
                </h2>
                
                <div className="space-y-4">
                  {searchResults.sources.map((source, index) => {
                    // Find the full resume data
                    const fullResume = resumesData?.data?.find((r: Resume) => r._id === source.resumeId);
                    
                    return (
                      <div key={source.resumeId || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-full">
                              <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {source.candidateName || 'Anonymous Candidate'}
                                </h3>
                                {source.similarity && (
                                  <div className="flex items-center space-x-2">
                                    <div className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                        {Math.round(source.similarity * 100)}% match
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Resume Info */}
                              {fullResume && (
                                <div className="space-y-2 mb-3">
                                  {fullResume.personalInfo?.email && (
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                      <Mail className="h-4 w-4 mr-2" />
                                      {fullResume.personalInfo.email}
                                    </div>
                                  )}
                                  
                                  {fullResume.personalInfo?.phone && (
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                      <Phone className="h-4 w-4 mr-2" />
                                      {fullResume.personalInfo.phone}
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                        Latest Experience
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {fullResume.extractedData?.experience ? formatExperience(fullResume.extractedData.experience) : 'No experience listed'}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                        Key Skills
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {fullResume.extractedData?.skills ? formatSkills(fullResume.extractedData.skills) : 'No skills listed'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Relevant Text Preview */}
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                  Relevant Content:
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {source.snippet}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => window.open(`/api/resumes/${source.resumeId}`, '_blank')}
                              className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                              title="View Full Resume"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Query Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              Search query: "{searchResults.query}" • Completed in {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
