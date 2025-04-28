import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Briefcase, Home, Settings, FileText, Building2, Users, Mail, Calendar, Image, UserPlus, Users2, Menu, X, Loader2 } from 'lucide-react';
import { UsersSidebar } from './UsersSidebar';
import { supabase } from '../services/supabase';
import type { Profile } from '../types/database';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      // No need to handle navigation as AuthContext will handle it
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const handleRoleChange = async (event: CustomEvent<{ newRole: string }>) => {
      if (!user) return;

      try {
        setIsSwitchingRole(true);
        
        // Fetch updated profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData);
        
        // Navigate to appropriate dashboard
        const dashboardPath = profileData.role === 'employer' 
          ? '/employer/dashboard'
          : '/dashboard';

        navigate(dashboardPath, { replace: true });
        
        toast.success(`Successfully switched to ${profileData.role.replace('_', ' ')} role`);
      } catch (error) {
        toast.error('Failed to complete role switch');
        console.error('Role change error:', error);
      } finally {
        setIsSwitchingRole(false);
      }
    };

    window.addEventListener('roleChanged', handleRoleChange as EventListener);
    return () => window.removeEventListener('roleChanged', handleRoleChange as EventListener);
  }, [user, navigate]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);
        setIsSwitchingRole(false); // Reset switching state after profile fetch

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
        setIsSwitchingRole(false); // Reset switching state on error
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
    { name: 'Profile', href: '/employer/company-profile', icon: Building2 }, // Make sure this matches exactly
    { name: 'Candidates', href: '/employer/candidates', icon: Users },
    { name: 'Settings', href: '/employer/settings', icon: Settings },
  ];

  const navigation = profile?.role === 'employer' ? employerNavigation : jobSeekerNavigation;

  const handleRoleSwitch = async () => {
    try {
      setIsSwitchingRole(true);
      
      // Verify current role before switching
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Navigate to select role page with current role info
      navigate('/select-role', { 
        state: { 
          previousPath: location.pathname,
          isRoleSwitch: true,
          currentRole: currentProfile.role
        }
      });
    } catch (error) {
      console.error('Error switching role:', error);
      toast.error('Failed to switch role. Please try again.');
    } finally {
      setIsSwitchingRole(false);
    }
  };

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

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Role Indicator and Switch */}
            {profile && (
              <Link
                to="/select-role"
                onClick={(e) => {
                  e.preventDefault();
                  handleRoleSwitch();
                }}
                className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-md"
              >
                {isSwitchingRole ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : profile.role === 'employer' ? (
                  <Briefcase className="h-4 w-4 mr-2" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                <span className="capitalize">
                  {isSwitchingRole ? 'Switching...' : profile.role?.replace('_', ' ')}
                </span>
              </Link>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 rounded-md"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign Out</span>
            </button>

            {/* Right Menu Button */}
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
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
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {profile?.full_name || user.email}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {profile?.role?.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Add Followers/Following Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{followersCount}</div>
                      <div className="text-xs text-gray-500">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{followingCount}</div>
                      <div className="text-xs text-gray-500">Following</div>
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





