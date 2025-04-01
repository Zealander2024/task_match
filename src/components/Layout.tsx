import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Briefcase, Home, Settings, FileText, Building2, Users, Mail, Calendar, Image, UserPlus, Users2 } from 'lucide-react';
import { JobSeekerProfile } from './JobSeekerProfile';
import { UsersSidebar } from './UsersSidebar';
import { supabase } from '../services/supabase';
import type { Profile } from '../types/database';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch followers count
        const { count: followersCount, error: followersError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id);

        if (followersError) throw followersError;
        setFollowersCount(followersCount || 0);

        // Fetch following count
        const { count: followingCount, error: followingError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);

        if (followingError) throw followingError;
        setFollowingCount(followingCount || 0);

      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const jobSeekerNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Profile', href: '/profile/edit', icon: User },
    { name: 'Applications', href: '/applications', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const employerNavigation = [
    { name: 'Dashboard', href: '/employer/dashboard', icon: Home },
    { name: 'Company Profile', href: '/employer/profile', icon: Building2 },
    { name: 'Candidates', href: '/employer/candidates', icon: Users },
    { name: 'Settings', href: '/employer/settings', icon: Settings },
  ];

  const navigation = user?.role === 'employer' ? employerNavigation : jobSeekerNavigation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Briefcase className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-800">TaskMatch</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <button
                  onClick={() => signOut()}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sticky Left Sidebar */}
        <div className="sticky top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-sm overflow-y-auto">
          <div className="p-4">
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || 'Profile'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-blue-600" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Set your name'}</p>
                    <p className="text-xs text-green-500 capitalize">{user.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Member since {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-sm text-gray-600 mb-1">
                        <Users2 className="h-4 w-4 mr-1" />
                        <span>Followers</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{followersCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center text-sm text-gray-600 mb-1">
                        <UserPlus className="h-4 w-4 mr-1" />
                        <span>Following</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{followingCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {children}
        </div>

        {/* Right Sidebar */}
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <UsersSidebar />
        </div>
      </div>
    </div>
  );
} 