import React from 'react';
import { CandidatesSidebar } from '../../components/CandidatesSidebar';

export function EmployerCandidatesPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="mt-2 text-gray-600">Browse and connect with potential candidates</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            {/* Add any additional employer-specific candidate features here */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Saved Candidates</h3>
                <p className="text-gray-600">View candidates you've saved for later</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Applications</h3>
                <p className="text-gray-600">See who has recently applied to your jobs</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar with candidate list */}
      <div className="w-80 border-l border-gray-200 bg-gray-50">
        <CandidatesSidebar />
      </div>
    </div>
  );
}