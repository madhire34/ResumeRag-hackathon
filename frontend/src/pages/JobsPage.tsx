import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const JobsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Job Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create and manage job postings, then match them with candidates using AI.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Create New Job
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Post a new job opening and define requirements
              </p>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                Create Job
              </button>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Match Candidates
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Find the best candidates for your job openings
              </p>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Find Matches
              </button>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Your Job Postings
            </h3>
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Job listings will appear here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;