import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export function EmployerSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [settings, setSettings] = useState({
    emailNotifications: true,
    applicationAlerts: true,
    // Add more settings as needed
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update settings in your database
      const { error } = await supabase
        .from('employer_settings')
        .upsert({
          user_id: user?.id,
          ...settings
        });

      if (error) throw error;
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError('Failed to update settings');
      console.error('Error updating settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Employer Settings</h1>
      
      {success && (
        <div className="bg-green-50 text-green-800 p-4 mb-4 rounded">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-800 p-4 mb-4 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-medium">Email Notifications</label>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({
                ...settings,
                emailNotifications: e.target.checked
              })}
              className="h-4 w-4 text-blue-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-medium">Application Alerts</label>
            <input
              type="checkbox"
              checked={settings.applicationAlerts}
              onChange={(e) => setSettings({
                ...settings,
                applicationAlerts: e.target.checked
              })}
              className="h-4 w-4 text-blue-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}