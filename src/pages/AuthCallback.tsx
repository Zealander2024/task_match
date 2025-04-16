import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export function AuthCallback() {  // Changed from 'export default' to 'export function'
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // If no profile exists, redirect to role selection
        if (!profile) {
          navigate('/select-role');
          return;
        }

        // If profile exists but no role, redirect to role selection
        if (!profile.role) {
          navigate('/select-role');
          return;
        }

        // If profile exists with role, redirect to dashboard
        navigate(profile.role === 'employer' ? '/employer/dashboard' : '/dashboard');
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/signin');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <div className="mt-4 text-sm text-gray-600">
                  Verifying your email...
                </div>
              </>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="text-green-600">
                Email verified successfully! Redirecting...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






