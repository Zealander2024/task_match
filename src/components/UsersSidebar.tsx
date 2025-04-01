import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, UserPlus, UserCheck } from 'lucide-react';
import type { Profile } from '../types/database';

export function UsersSidebar() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchUsers() {
      if (!user) return;

      try {
        // Fetch all users except current user
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id);

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Fetch current user's following
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) throw followingError;
        setFollowing(new Set(followingData?.map(f => f.following_id) || []));

      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [user]);

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      if (following.has(userId)) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setFollowing(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: user.id,
              following_id: userId,
            },
          ]);

        if (error) throw error;
        setFollowing(prev => new Set([...prev, userId]));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-64 bg-white shadow-sm p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested Users</h2>
      <div className="space-y-4">
        {users.map((userProfile) => (
          <div key={userProfile.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {userProfile.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.full_name || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {userProfile.full_name || 'Anonymous User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{userProfile.role}</p>
              </div>
            </div>
            <button
              onClick={() => handleFollow(userProfile.id)}
              className={`flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                following.has(userProfile.id)
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {following.has(userProfile.id) ? (
                <>
                  <UserCheck className="h-3 w-3 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Follow
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 