import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { AlertCircle } from 'lucide-react';
import { ProfileFormData, profileValidation } from '../types/profile';
import { EmployerProfileForm } from '../components/EmployerProfileForm';
import { JobSeekerProfileForm } from '../components/JobSeekerProfileForm';

interface Profile {
  id: string;
  full_name: string;
  bio: string;
  work_email: string;
  years_of_experience: number;
  skills: string[];
  role: 'employer' | 'job_seeker';
}

export function CreateProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<'employer' | 'job_seeker' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (!data || !data.role) {
          navigate('/select-role');
          return;
        }

        setUserRole(data.role);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  // Return appropriate form based on user role
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : (
          userRole === 'employer' ? <EmployerProfileForm /> : <JobSeekerProfileForm />
        )}
      </div>
    </div>
  );
}




