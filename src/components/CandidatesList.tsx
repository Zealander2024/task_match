import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  skills: string[];
  experience_years: number;
  // Add more fields as needed
}

export function CandidatesList() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'job_seeker');

      if (error) throw error;

      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading candidates...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Candidates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold">{candidate.full_name}</h2>
            <p className="text-gray-600">{candidate.email}</p>
            {/* Add more candidate information as needed */}
          </div>
        ))}
      </div>
    </div>
  );
}