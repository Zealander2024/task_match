import React, { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

interface AdminProfile {
  fullName: string;
  role: string;
  avatarUrl: string | null;
  bio: string;
  email: string;
  location: string;
  joinDate: string;
  department: string;
  skills: string[];
  lastActive: string;
}

export function AdminProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const savedProfile = localStorage.getItem('adminProfile');
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center p-6">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">No admin profile found</p>
          <Link
            to="/admin/profile/edit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Profile
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Admin Profile</CardTitle>
          <Link to="/admin/profile/edit">
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-6">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
              <User className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.fullName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">{profile.role}</Badge>
              <Badge variant="outline">{profile.department}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Mail className="h-4 w-4" />
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <MapPin className="h-4 w-4" />
            <span>{profile.location}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            <span>Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <Briefcase className="h-4 w-4" />
            <span>Last active {new Date(profile.lastActive).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-2">Bio</h3>
          <p className="text-gray-600 dark:text-gray-300">{profile.bio}</p>
        </div>

        <div className="pt-4">
          <h3 className="text-lg font-semibold mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, index) => (
              <Badge key={index} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ProfileSkeleton = () => (
  <Card className="w-full max-w-2xl mx-auto">
    <CardContent className="space-y-6 p-6">
      <div className="flex items-center space-x-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </CardContent>
  </Card>
);
