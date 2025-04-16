import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, UserPlus, UserCheck, MessageCircle, X } from 'lucide-react';
import type { Profile } from '../types/database';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface UsersSidebarProps {
  onClose?: () => void;
}

export function UsersSidebar({ onClose }: UsersSidebarProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users except the current user
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, created_at')
        .neq('id', user?.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // If user is authenticated, fetch following relationships
      if (user) {
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) throw followingError;
        setFollowing(new Set(followingData?.map(f => f.following_id) || []));
      }

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      const isFollowing = following.has(targetUserId);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setFollowing(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setFollowing(prev => new Set([...prev, targetUserId]));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      setError('Failed to update follow status');
    }
  };

  const handleStartChat = async (targetUserId: string, userName: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      // Check if conversation exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      let conversationId;

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id,
            user2_id: targetUserId,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        conversationId = newConversation.id;
      }

      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      setError('Failed to start conversation');
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up realtime subscription for profile changes
    const channel = supabase.channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="p-4">
      <button
        onClick={onClose}
        className="md:hidden mb-4 p-2 text-gray-500 hover:text-gray-700"
      >
        <X className="h-6 w-6" />
      </button>
      
      <div className="w-64 bg-white shadow-sm p-4 h-full overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Users</h2>
        
        {error && (
          <div className="mb-4 p-2 bg-red-50 text-red-600 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <User className="h-12 w-12 text-gray-300 mb-2" />
            <p>No users found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try refreshing or check back later
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((userProfile) => (
              <div key={userProfile.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile.full_name || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{userProfile.role}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleStartChat(userProfile.id, userProfile.full_name || 'User')}
                          className="relative flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {unreadMessages[userProfile.id] > 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                              {unreadMessages[userProfile.id]}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Message</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {user && (
                    <button
                      onClick={() => handleFollow(userProfile.id)}
                      className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        following.has(userProfile.id)
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {following.has(userProfile.id) ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



