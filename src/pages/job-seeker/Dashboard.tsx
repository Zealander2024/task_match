import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Briefcase, Clock, CheckCircle, XCircle, User, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Job, Application } from '../../types/database';
import { JobSeekerProfile } from '../../components/JobSeekerProfile';
import { JobSearch } from '../../components/JobSearch';
import { JobCard } from '../../components/JobCard';
import type { SearchFilters } from '../../components/JobSearch';

export function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    if (!user) return;

    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_posts')
        .select(`
          *,
          employer:employer_id(
            full_name,
            company_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (filters: SearchFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('job_posts')
        .select(`
          *,
          employer:employer_id(
            full_name,
            company_name,
            avatar_url
          )
        `)
        .eq('status', 'active');

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.jobType.length > 0) {
        query = query.in('job_type', filters.jobType);
      }

      if (filters.experienceLevel) {
        query = query.eq('experience_level', filters.experienceLevel);
      }

      if (filters.salary) {
        query = query
          .gte('salary_min', filters.salary[0])
          .lte('salary_max', filters.salary[1]);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.remote) {
        query = query.eq('is_remote', true);
      }

      if (filters.industry) {
        query = query.eq('industry', filters.industry);
      }

      if (filters.postedWithin) {
        const date = new Date();
        switch (filters.postedWithin) {
          case '24 hours':
            date.setHours(date.getHours() - 24);
            break;
          case '7 days':
            date.setDate(date.getDate() - 7);
            break;
          case '14 days':
            date.setDate(date.getDate() - 14);
            break;
          case '30 days':
            date.setDate(date.getDate() - 30);
            break;
        }
        query = query.gte('created_at', date.toISOString());
      }

      if (filters.skills.length > 0) {
        query = query.contains('required_skills', filters.skills);
      }

      const { data, error: searchError } = await query
        .order('created_at', { ascending: false });

      if (searchError) throw searchError;
      setJobs(data || []);
    } catch (err) {
      console.error('Error searching jobs:', err);
      setError('Failed to search jobs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Next Opportunity</h1>
            <p className="text-gray-600 mb-6">Search through thousands of job listings</p>
            
            <div className="w-full">
              <JobSearch onSearch={handleSearch} />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Job Listings */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">No jobs found matching your criteria</p>
              </div>
            ) : (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApply={() => {/* Handle apply */}}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





