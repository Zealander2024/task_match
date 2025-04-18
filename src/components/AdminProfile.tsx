import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminProfile {
  fullName: string;
  role: string;
  avatarUrl: string | null;
  bio: string;
}

export function AdminProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('adminProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  if (!profile) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500 mb-4">No admin profile found</p>
        <Link
          to="/admin/profile"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.fullName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-8 w-8 text-gray-400" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{profile.fullName}</h2>
          <p className="text-sm text-gray-500">{profile.role}</p>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 text-gray-600">{profile.bio}</p>
      )}

      <div className="mt-6">
        <Link
          to="/admin/profile"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
}