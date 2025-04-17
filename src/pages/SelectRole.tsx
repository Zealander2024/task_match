import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Briefcase, User, Loader2 } from 'lucide-react';

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

  // Add this effect to reset any loading states when the component mounts
  useEffect(() => {
    const layoutElement = document.querySelector('[data-layout]');
    if (layoutElement) {
      // This will trigger a re-render of the Layout component
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

        if (profile?.role && !isChangingRole) {
          setCurrentRole(profile.role);
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

      const profile: Profile = {
        id: user.id,
        role: role,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profile);

      if (upsertError) throw upsertError;

      // Dispatch role changed event with the new role
      window.dispatchEvent(new CustomEvent('roleChanged', {
        detail: { newRole: role }
      }));

      // Check if employer profile exists
      if (role === 'employer') {
        const { data: employerProfile } = await supabase
          .from('employer_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!employerProfile) {
          // Force reload before navigation
          window.location.href = '/employer/create-profile';
          return;
        }
      }

      // Add a small delay to ensure the profile update is processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force reload with the new route
      window.location.href = role === 'employer' ? '/employer/dashboard' : '/dashboard';

    } catch (err) {
      console.error('Error setting role:', err);
      setError(err instanceof Error ? err.message : 'Failed to set role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {currentRole && !isChangingRole ? 'Switch Role' : 'Select Your Role'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {currentRole && !isChangingRole 
              ? 'You are currently using the platform as:'
              : 'Choose how you want to use the platform'}
          </p>
        </div>

        {/* Current Role Display */}
        {currentRole && !isChangingRole && (
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-lg font-medium text-blue-900">
              {currentRole === 'employer' ? 'Employer' : 'Job Seeker'}
            </p>
            <button
              onClick={() => setIsChangingRole(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Switch to {currentRole === 'employer' ? 'Job Seeker' : 'Employer'} mode
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        {/* Role Selection Buttons */}
        {(!currentRole || isChangingRole) && (
          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect('job_seeker')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <User className="h-5 w-5 mr-2" />
                  I'm a Job Seeker
                </>
              )}
            </button>

            <button
              onClick={() => handleRoleSelect('employer')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Briefcase className="h-5 w-5 mr-2" />
                  I'm an Employer
                </>
              )}
            </button>

            {isChangingRole && (
              <button
                onClick={() => setIsChangingRole(false)}
                className="w-full text-sm text-gray-600 hover:text-gray-800 underline mt-2"
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









