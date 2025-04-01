import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Briefcase, Search } from 'lucide-react';
import type { Profile } from '../types/database';

export function SelectRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = async (role: Profile['role']) => {
    if (!user) {
      setError('You must be logged in to select a role');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        if (fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
          throw fetchError;
        }
      }

      // Prepare profile data
      const profileData: Partial<Profile> = {
        id: user.id,
        role,
        full_name: '',
      };

      // Upsert the profile
      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        console.error('Error details:', {
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint
        });
        throw upsertError;
      }

      console.log('Profile updated successfully:', data);

      // Navigate based on role
      navigate(role === 'employer' ? '/employer/dashboard' : '/dashboard');
    } catch (err) {
      console.error('Error setting role:', err);
      if (err instanceof Error) {
        setError(`Failed to set user role: ${err.message}`);
      } else {
        setError('Failed to set user role. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Choose your role
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select how you want to use TaskMatch
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect('employer')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Briefcase className="h-6 w-6 mr-2" />
              I'm an Employer
            </button>

            <button
              onClick={() => handleRoleSelect('job_seeker')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Search className="h-6 w-6 mr-2" />
              I'm a Job Seeker
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}