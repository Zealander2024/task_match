import { useState, useEffect } from 'react';
import { JobPost } from '../types/database';
import { JobPostsList } from './JobPostsList';
import { JobPostDialog } from './JobPostDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function JobSeekerDashboard() {
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // You can add any additional initialization here
    setLoading(false);
  }, [user]);

  const handleJobSelect = (job: JobPost) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Seeker Dashboard</h1>
            <p className="text-gray-600">Browse available jobs and find your next opportunity</p>
          </div>

          {/* Job Posts Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <JobPostsList onJobSelect={handleJobSelect} />
          </div>

          {/* Job Details Dialog */}
          <JobPostDialog
            job={selectedJob}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </div>
      </div>
    </div>
  );
} 