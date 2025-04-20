import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Briefcase, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Profile } from '../types/database';
import { JobSeekerPayPalSetup } from './JobSeekerPayPalSetup';
import { Root as Tabs, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';

export function JobSeekerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

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
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="payment">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {profile?.full_name || 'No name set'}
                  </h2>
                  <p className="text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Professional Info</h3>
                  <div className="space-y-2">
                    <p className="flex items-center text-gray-600">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {profile?.title || 'No title set'}
                    </p>
                    <p className="flex items-center text-gray-600">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {profile?.website || 'No website set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to="/profile/edit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <JobSeekerPayPalSetup />
        </TabsContent>
      </Tabs>
    </div>
  );
} 



