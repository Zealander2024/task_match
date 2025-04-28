import React from 'react';
import { CandidatesList } from '../../components/CandidatesList';


export function EmployerCandidatesPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="mt-2 text-gray-600">Browse and connect with potential candidates</p>
        </div>
        
        {/* Replace the placeholder content with CandidatesList */}
        <CandidatesList />
      </div>
      
      {/* Sidebar with candidate list */}
      
    </div>
  );
}
