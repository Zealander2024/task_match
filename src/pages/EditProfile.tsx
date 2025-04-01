import React from 'react';
import { ProfileEdit } from '../components/ProfileEdit';

export function EditProfile() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Edit Your Profile
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Update your profile information to help employers find you
          </p>
        </div>

        <div className="mt-12">
          <ProfileEdit />
        </div>
      </div>
    </div>
  );
} 