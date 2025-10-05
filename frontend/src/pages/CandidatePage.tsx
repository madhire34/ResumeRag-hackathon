import React from 'react';
import { useParams } from 'react-router-dom';

const CandidatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Candidate Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Viewing candidate ID: {id}
          </p>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Detailed candidate profile will be displayed here including:
            <ul className="mt-4 text-left list-disc list-inside space-y-1">
              <li>Personal information (role-based visibility)</li>
              <li>Skills and experience</li>
              <li>Education and certifications</li>
              <li>Project portfolio</li>
              <li>AI-generated summary</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePage;