import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Bell, Lock, Mail, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

export function EmployerSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState({
    newApplications: true,
    candidateMessages: true,
    jobAlerts: true,
    marketingEmails: false
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to update password');
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (setting: string) => {
    setEmailNotifications(prev => {
      const newSettings = {
        ...prev,
        [setting]: !prev[setting as keyof typeof prev]
      };

      // Update in database
      supabase
        .from('employer_notification_settings')
        .upsert({
          employer_id: user?.id,
          settings: newSettings
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Failed to update notification settings');
            console.error('Error updating notifications:', error);
          }
        });

      return newSettings;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Profile Information</h2>
          </div>
          <div className="text-gray-600 mb-4">
            <p>Email: {user?.email}</p>
            <p>Account Type: Employer</p>
          </div>
          <button
            onClick={() => window.location.href = '/employer/create-profile'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit Company Profile →
          </button>
        </section>

        {/* Security Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Notifications Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(emailNotifications).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleNotificationChange(key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Delete Account Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold">Delete Account</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                // Implement account deletion logic
                toast.error('Account deletion is not implemented yet');
              }
            }}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
}
