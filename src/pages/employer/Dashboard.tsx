import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { JobPostForm } from '../../components/JobPostForm';
import { Briefcase, DollarSign, MapPin, Clock, Calendar, FileText, CreditCard, Trash2 } from 'lucide-react';
import type { JobPost } from '../../types/database';

export function EmployerDashboard() {
  const { user } = useAuth();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobPosts();
  }, [user]);

  async function fetchJobPosts() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobPosts(data || []);
    } catch (err) {
      console.error('Error fetching job posts:', err);
      setError('Failed to fetch job posts');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      setJobPosts(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      console.error('Error deleting job post:', err);
      setError('Failed to delete job post');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Employer Dashboard</h1>
        <button
          onClick={() => document.getElementById('jobPostForm')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Post New Job
        </button>
      </div>

      {/* Job Posts List */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Your Job Posts</h2>
        </div>
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : jobPosts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No job posts yet</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {jobPosts.map((job) => (
                <li key={job.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{job.category}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {job.budget}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {job.work_schedule}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Job Post Form */}
      <div id="jobPostForm" className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Post a New Job</h2>
        </div>
        <div className="border-t border-gray-200">
          <JobPostForm onSuccess={fetchJobPosts} />
        </div>
      </div>
    </div>
  );
}