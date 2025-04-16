import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Briefcase, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Profile } from '../types/database';

export function JobSeekerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500 mb-4">Profile not found</p>
        <Link
          to="/profile/edit"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <Link
            to="/profile/edit"
            className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </Link>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{profile.full_name}</h3>
          <p className="text-sm text-gray-500">Job Seeker</p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="space-y-3">
        {profile.bio && (
          <p className="text-sm text-gray-600">{profile.bio}</p>
        )}

        {profile.work_email && (
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2" />
            {profile.work_email}
          </div>
        )}

        {profile.years_of_experience !== undefined && (
          <div className="flex items-center text-sm text-gray-600">
            <Briefcase className="h-4 w-4 mr-2" />
            {profile.years_of_experience} years of experience
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Links */}
        {profile.portfolio_images && profile.portfolio_images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Portfolio</h4>
            <div className="space-y-2">
              {profile.portfolio_images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`Portfolio ${index + 1}`}
                    className="h-20 w-full object-cover rounded-lg"
                  />
                  {image.link && (
                    <a
                      href={image.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      <LinkIcon className="h-6 w-6 text-white" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resume Link */}
        {profile.resume_url && (
          <div className="pt-4 border-t">
            <a
              href={profile.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Resume
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 
