import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const isRoleSwitch = location.state?.isRoleSwitch;
  const previousPath = location.state?.previousPath;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentRole, setCurrentRole] = useState<'employer' | 'job_seeker' | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Check existing role on mount
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

        if (profileError) throw profileError;

        if (profile?.role) {
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

      // Don't update if selecting same role and not switching
      if (currentRole === role && !isRoleSwitch) {
        toast.info('You are already in this role');
        return;
      }

      // Update the profile with the selected role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Dispatch role change event
      window.dispatchEvent(new CustomEvent('roleChanged', {
        detail: { newRole: role }
      }));

      toast.success(`Role set to ${role === 'employer' ? 'Employer' : 'Job Seeker'}`);

      // Navigate to appropriate dashboard based on role
      navigate(role === 'employer' ? '/employer/dashboard' : '/dashboard', { replace: true });
      
    } catch (error) {
      console.error('Error selecting role:', error);
      toast.error('Failed to select role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add cancel button handler
  const handleCancel = () => {
    if (previousPath) {
      navigate(previousPath);
    } else {
      navigate(currentRole === 'employer' ? '/employer/dashboard' : '/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Briefcase className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {isRoleSwitch ? 'Switch Your Role' : 'Welcome to JobConnect'}
            </h2>
            <p className="text-lg text-gray-600">
              {isRoleSwitch 
                ? "Choose the role you'd like to switch to"
                : 'Select how you want to use our platform'}
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="mt-12 space-y-6">
            {/* Job Seeker Card */}
            <div className="relative">
              <button
                onClick={() => handleRoleSelect('job_seeker')}
                disabled={loading}
                className="w-full group relative"
              >
                <div className="relative rounded-2xl border-2 border-gray-200 bg-white p-6 sm:p-8 hover:border-blue-200 hover:shadow-lg transition-all duration-300 ease-in-out">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="p-4 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                        <User className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        Job Seeker
                      </h3>
                      <p className="mt-2 text-gray-500">
                        Find your dream job and connect with top employers. Access personalized job recommendations and career tools.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Employer Card */}
            <div className="relative">
              <button
                onClick={() => handleRoleSelect('employer')}
                disabled={loading}
                className="w-full group relative"
              >
                <div className="relative rounded-2xl border-2 border-gray-200 bg-white p-6 sm:p-8 hover:border-blue-200 hover:shadow-lg transition-all duration-300 ease-in-out">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="p-4 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Employer
                      </h3>
                      <p className="mt-2 text-gray-500">
                        Post jobs, manage applications, and find the perfect candidates for your organization.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-4 text-gray-500 space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Processing your selection...</span>
              </div>
            )}

            {/* Cancel Button for Role Switch */}
            {isRoleSwitch && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  Return to Previous Page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




