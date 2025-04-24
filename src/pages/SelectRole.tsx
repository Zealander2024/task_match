import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Briefcase, User, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  role: 'employer' | 'job_seeker';
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export function SelectRole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentRole, setCurrentRole] = useState<'employer' | 'job_seeker' | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  useEffect(() => {
    const layoutElement = document.querySelector('[data-layout]');
    if (layoutElement) {
      layoutElement.dispatchEvent(new CustomEvent('roleSelectMounted'));
    }
  }, []);

  useEffect(() => {
    const checkExistingRole = async () => {
      if (!user) {
        navigate('/signin');
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profile?.role) {
          // Handle admin role differently
          if (profile.role === 'admin') {
            navigate('/admin/dashboard');
            return;
          }
          
          if (!isChangingRole) {
            setCurrentRole(profile.role as 'employer' | 'job_seeker');
          }
        }
      } catch (err) {
        console.error('Error checking role:', err);
        setError('Failed to check existing role');
      }
    };

    checkExistingRole();
  }, [user, navigate, isChangingRole]);

  const handleRoleSelect = async (role: 'employer' | 'job_seeker') => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Update the profile with the selected role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Trigger role change event
      window.dispatchEvent(new CustomEvent('roleChanged', {
        detail: { newRole: role }
      }));

      toast.success(`Role selected: ${role === 'employer' ? 'Employer' : 'Job Seeker'}`);

      // Redirect to appropriate profile creation page using the correct path
      const redirectPath = role === 'employer' 
        ? '/employer/create-profile'
        : '/create-profile';
      
      navigate(redirectPath);
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Failed to update role');
      setLoading(false);
    }
  };

  // Add a check for profile completion
  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, profile_completed')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // If profile is already completed, redirect to appropriate dashboard
        if (profile?.profile_completed) {
          const redirectPath = profile.role === 'employer' 
            ? '/employer/dashboard'
            : '/job-seeker/dashboard';
          navigate(redirectPath);
        }
      } catch (err) {
        console.error('Error checking profile status:', err);
      }
    };

    checkProfileStatus();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {currentRole && !isChangingRole ? 'Switch Role' : 'Welcome to JobConnect'}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {currentRole && !isChangingRole 
              ? 'You are currently using the platform as:'
              : 'Choose how you want to use our platform'}
          </p>
        </div>

        {/* Current Role Display */}
        {currentRole && !isChangingRole && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${
                  currentRole === 'employer' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {currentRole === 'employer' ? (
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  ) : (
                    <User className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {currentRole === 'employer' ? 'Employer' : 'Job Seeker'}
                  </h3>
                  <p className="text-sm text-gray-500">Current Role</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangingRole(true)}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                Switch Role
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Role Selection Buttons */}
        {(!currentRole || isChangingRole) && (
          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect('job_seeker')}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 transition-all duration-200 rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-900">Job Seeker</h3>
                  <p className="text-sm text-gray-500">Find your dream job</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            <button
              onClick={() => handleRoleSelect('employer')}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 transition-all duration-200 rounded-xl shadow-sm p-6 border border-gray-200 flex items-center justify-between group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-900">Employer</h3>
                  <p className="text-sm text-gray-500">Post jobs and find talent</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {loading && (
              <div className="flex items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </div>
            )}

            {isChangingRole && (
              <button
                onClick={() => setIsChangingRole(false)}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline mt-4"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}










