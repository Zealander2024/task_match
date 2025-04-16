import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight } from 'lucide-react';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome! Choose Your Next Step
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You can complete your profile now or do it later
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-blue-500/10 sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={() => navigate('/create-profile')}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Complete Your Profile Now
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}