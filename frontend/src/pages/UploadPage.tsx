import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resumeAPI, handleApiError } from '../lib/api';
import { Upload, FileText, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Resume } from '../types';

const UploadPage: React.FC = () => {
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadResults, setUploadResults] = useState<{[key: string]: { success: boolean; message: string; resume?: Resume }}>({});
  const queryClient = useQueryClient();

  // Fetch existing resumes
  const { data: resumesData, isLoading: loadingResumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumeAPI.getList({ limit: 10 }),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, fileId }: { file: File; fileId: string }) => 
      resumeAPI.upload(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(prev => ({ ...prev, [fileId]: percentCompleted }));
      }),
    onSuccess: (data, { fileId }) => {
      setUploadResults(prev => ({
        ...prev,
        [fileId]: { success: true, message: 'Resume uploaded and parsed successfully!', resume: data.data }
      }));
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: (error, { fileId }) => {
      const apiError = handleApiError(error);
      setUploadResults(prev => ({
        ...prev,
        [fileId]: { success: false, message: apiError.error.message }
      }));
    },
    onSettled: (_, __, { fileId }) => {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: resumeAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.type !== 'application/pdf') {
        const fileId = `${file.name}-${Date.now()}`;
        setUploadResults(prev => ({
          ...prev,
          [fileId]: { success: false, message: 'Only PDF files are supported' }
        }));
        return;
      }

      const fileId = `${file.name}-${Date.now()}`;
      uploadMutation.mutate({ file, fileId });
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const clearResult = (fileId: string) => {
    setUploadResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  };

  const handleDelete = async (resumeId: string) => {
    if (window.confirm('Are you sure you want to delete this resume?')) {
      deleteMutation.mutate(resumeId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Upload Resumes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload PDF resumes for AI-powered parsing and analysis. Drag and drop or click to select files.
          </p>
          
          {/* Upload Area */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-primary-600 dark:text-primary-400">
                Drop the PDF files here...
              </p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop PDF files here, or click to select files
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Supports PDF files up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Uploading...
              </h3>
              {Object.entries(uploadProgress).map(([fileId, progress]) => {
                const fileName = fileId.split('-')[0];
                return (
                  <div key={fileId} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {fileName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Results */}
          {Object.keys(uploadResults).length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Upload Results
              </h3>
              {Object.entries(uploadResults).map(([fileId, result]) => {
                const fileName = fileId.split('-')[0];
                return (
                  <div key={fileId} className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className={`font-medium ${
                            result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                          }`}>
                            {fileName}
                          </p>
                          <p className={`text-sm ${
                            result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                          }`}>
                            {result.message}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => clearResult(fileId)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Existing Resumes */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Uploaded Resumes
            </h2>
            {!loadingResumes && resumesData?.pagination && (
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded-full text-sm font-medium">
                {resumesData.pagination.total} {resumesData.pagination.total === 1 ? 'Resume' : 'Resumes'}
              </span>
            )}
          </div>
          
          {loadingResumes ? (
            <LoadingSpinner message="Loading resumes..." />
          ) : (
            <div className="space-y-3">
              {!resumesData?.data || resumesData.data.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No resumes uploaded yet. Upload your first resume above!
                </p>
              ) : (
                resumesData.data.map((resume: Resume) => (
                  <div key={resume._id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {resume.originalName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
                          {resume.personalInfo?.name && (
                            <span> • {resume.personalInfo.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`/api/resumes/${resume._id}`, '_blank')}
                        className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                        title="View Resume"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resume._id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete Resume"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
