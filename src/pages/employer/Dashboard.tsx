import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { JobPostForm } from '../../components/JobPostForm';
import { NotificationBell } from '../../components/NotificationBell';
import { 
  Briefcase, DollarSign, MapPin, Clock, Calendar, FileText, CreditCard,
  Trash2, Building2, User, Mail, Plus, X
} from 'lucide-react';
import type { JobPost, Profile } from '../../types/database';
import { useNavigate } from 'react-router-dom';

export function EmployerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        navigate('/select-role', { replace: true });
        return;
      }

      if (profile.role !== 'employer') {
        navigate('/select-role', { replace: true });
      }
    };

    checkProfile();
  }, [user, navigate]);

  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [employerProfile, setEmployerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
      if (!user) return;

      try {
      // Fetch employer profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
          .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setEmployerProfile(profileData);

      // Fetch job posts that are not marked as deleted
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
            .select('*')
        .eq('employer_id', user.id)
        .eq('status', 'active')  // Only fetch active jobs
        .order('created_at', { ascending: false });

      if (jobError) throw jobError;
      setJobPosts(jobData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
  }

  const handleDeleteJob = async (jobId: string) => {
    try {
      // Instead of deleting, update the job post status to 'deleted'
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'deleted' })
        .eq('id', jobId);
  
      if (error) throw error;
      
      // Remove the job from the local state
      setJobPosts(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      console.error('Error deleting job post:', err);
      setError('Failed to delete job post');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Dashboard</h1>
          {employerProfile && (
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {employerProfile.full_name}
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                {employerProfile.email}
              </div>
            </div>
          )}
          </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <button
            onClick={() => setShowJobForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </button>
                </div>
              </div>

      {showJobForm ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Post a New Job</h2>
            <button
              onClick={() => setShowJobForm(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <JobPostForm onSuccess={() => {
            setShowJobForm(false);
            fetchData();
          }} />
        </div>
      ) : (
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {job.company_logo_url ? (
                          <img
                            src={job.company_logo_url}
                            alt={job.company_name}
                            className="h-12 w-12 object-contain rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="h-12 w-12 flex items-center justify-center bg-gray-100 rounded-lg">
                            <Building2 className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-500">{job.company_name}</p>
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
                      </div>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-red-600 hover:text-red-800"
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
      )}
    </div>
  );
}


