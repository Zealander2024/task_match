import React from 'react';
import { Card } from '../../components/ui/card';
import { useTheme } from '../../contexts/ThemeContext';

export function AdminDashboard() {
  const { isDarkMode } = useTheme();

  return (
    <div className="px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-200 dark:bg-gray-900 dark:text-white">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Welcome to your admin dashboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Job Posts</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">24</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Active job posts</p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employers</h3>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">12</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Registered employers</p>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Applications</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">48</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Total applications</p>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">New job post created</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Senior Developer at Tech Corp</p>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">2h ago</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 text-left rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
              <h4 className="font-medium text-blue-700 dark:text-blue-400">Create Job Post</h4>
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">Post a new job listing</p>
            </button>
            <button className="p-4 text-left rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200">
              <h4 className="font-medium text-green-700 dark:text-green-400">Add Employer</h4>
              <p className="mt-1 text-sm text-green-600 dark:text-green-300">Register new employer</p>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

