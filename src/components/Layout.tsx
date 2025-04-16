import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Briefcase, Home, Settings, FileText, Building2, Users, Mail, Calendar, Image, UserPlus, Users2, Menu, X } from 'lucide-react';
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
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

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
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left Menu Button */}
          <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {isLeftSidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Logo and other header content */}
          <div className="flex-1 flex justify-center lg:justify-start">
            <Link to="/" className="flex items-center">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">TaskMatch</span>
            </Link>
          </div>

          {/* Right Menu Button */}
          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="flex relative">
        {/* Left Sidebar - Mobile Overlay */}
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden ${
            isLeftSidebarOpen ? 'opacity-100 z-30' : 'opacity-0 -z-10'
          }`}
          onClick={() => setIsLeftSidebarOpen(false)}
        />

        {/* Left Sidebar */}
        <div
          className={`
            fixed lg:sticky top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-sm
            transform transition-transform duration-300 ease-in-out lg:transform-none
            ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            z-30 lg:z-0
          `}
        >
          <div className="h-full overflow-y-auto">
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
                    </div>
                    {/* User info */}
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
                      onClick={() => setIsLeftSidebarOpen(false)}
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
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 bg-gray-50">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>

        {/* Right Sidebar - Mobile Overlay */}
        <div
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity md:hidden ${
            isRightSidebarOpen ? 'opacity-100 z-30' : 'opacity-0 -z-10'
          }`}
          onClick={() => setIsRightSidebarOpen(false)}
        />

        {/* Right Sidebar */}
        <div
          className={`
            fixed md:sticky top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-sm
            transform transition-transform duration-300 ease-in-out md:transform-none
            ${isRightSidebarOpen ? 'translate-x-0 right-0' : 'translate-x-full md:translate-x-0'}
            z-30 md:z-0
          `}
        >
          <div className="h-full overflow-y-auto">
            <UsersSidebar onClose={() => setIsRightSidebarOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  );
} 



