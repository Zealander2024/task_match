import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Briefcase, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Root as Tabs, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { JobSeekerPayPalSetup } from './JobSeekerPayPalSetup';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  work_email: string;
  years_of_experience: number;
  skills: string[];
  role: string;
}

export function JobSeekerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <Button
          onClick={() => navigate('/profile/edit')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Edit Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex space-x-4 border-b mb-8">
          <TabsTrigger
            value="profile"
            className={`pb-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Profile Information
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className={`pb-2 ${activeTab === 'payment' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Payment Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-full w-full p-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{profile?.full_name}</h2>
                    <p className="text-gray-600 flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {profile?.work_email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Experience</h3>
                    <p className="text-gray-600">
                      {profile?.years_of_experience} years
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Bio</h3>
                    <p className="text-gray-600">{profile?.bio}</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile?.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure your payment information to receive payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobSeekerPayPalSetup />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 





