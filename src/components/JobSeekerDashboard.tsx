import { useState, useEffect, useCallback, useRef } from 'react';
import { JobPost } from '../types/database';
import { JobPostsList } from './JobPostsList';
import { JobPostDialog } from './JobPostDialog';
import { JobSearch } from './JobSearch';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import type { SearchFilters } from './JobSearch';

export function JobSeekerDashboard() {
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const { user } = useAuth();
  const isSearching = useRef(false);

  useEffect(() => {
    if (!user) return;
    fetchInitialJobs();
  }, [user]);

  const fetchInitialJobs = async () => {
    if (isSearching.current) return;
    
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching initial jobs:', err);
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (filters: SearchFilters) => {
    isSearching.current = true;
    setLoading(true);

    try {
      let query = supabase
        .from('job_posts')
        .select('*')
        .eq('status', 'active');

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.jobType.length > 0) {
        query = query.in('job_type', filters.jobType);
      }

      // Add other filter conditions...

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search jobs');
    } finally {
      setLoading(false);
      isSearching.current = false;
    }
  }, []);

  const handleJobSelect = useCallback((job: JobPost) => {
    setSelectedJob(job);
    setDialogOpen(true);
  }, []);

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

  console.log('Rendering JobSeekerDashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Seeker Dashboard</h1>
            <p className="text-gray-600">Browse available jobs and find your next opportunity</p>
            
            {/* Search Component */}
            <div className="mt-6">
              <JobSearch onSearch={handleSearch} />
            </div>
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



