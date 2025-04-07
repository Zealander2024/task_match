import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, UserPlus, UserCheck, MessageCircle } from 'lucide-react';
import type { Profile } from '../types/database';
import { useNavigate } from 'react-router-dom';
// Fix the import path
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Badge } from "./ui/badge";

export function UsersSidebar() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread messages count
    const fetchUnreadMessages = async () => {
      console.log('Fetching unread messages...'); // Debug log
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, count(*)', { count: 'exact' })
        .eq('read', false)
        .neq('sender_id', user.id)
        .group_by('sender_id');

      if (error) {
        console.error('Error fetching unread messages:', error);
        return;
      }

      console.log('Unread messages data:', data); // Debug log

      const unreadCounts = (data || []).reduce((acc, curr) => {
        acc[curr.sender_id] = parseInt(curr.count);
        return acc;
      }, {} as Record<string, number>);

      console.log('Processed unread counts:', unreadCounts); // Debug log
      setUnreadMessages(unreadCounts);
    };

    fetchUnreadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        console.log('Message change detected:', payload); // Debug log

        if (payload.eventType === 'INSERT' && payload.new.sender_id !== user.id) {
          setUnreadMessages(prev => ({
            ...prev,
            [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1
          }));
        } else if (payload.eventType === 'UPDATE' && payload.new.read === true) {
          setUnreadMessages(prev => ({
            ...prev,
            [payload.new.sender_id]: Math.max(0, (prev[payload.new.sender_id] || 0) - 1)
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

  const handleStartChat = async (userId: string, userName: string) => {
    if (!user) return;

    try {
      // Try to create a conversation directly
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: userId,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        
        // If that fails, try with different column names
        const { data: altConversation, error: altError } = await supabase
          .from('conversations')
          .insert({
            sender_id: user.id,
            receiver_id: userId,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (altError) {
          console.error('Alternative approach also failed:', altError);
          throw new Error('Could not create conversation with any known schema');
        }
        
        // Navigate using the alternative conversation ID
        if (altConversation?.id) {
          navigate(`/messages/${altConversation.id}?name=${encodeURIComponent(userName || 'User')}`);
          return;
        }
      }

      // Navigate using the conversation ID from the first attempt
      if (newConversation?.id) {
        navigate(`/messages/${newConversation.id}?name=${encodeURIComponent(userName || 'User')}`);
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      
      // Show a more detailed error message to help with debugging
      alert(`Chat feature not available: Please make sure the conversations table exists in your database with the correct schema. Check the console for more details.`);
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
    <div className="w-64 bg-white shadow-sm p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested Users</h2>
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <User className="h-12 w-12 text-gray-300 mb-2" />
          <p>No users found</p>
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
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile.full_name || 'Anonymous User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{userProfile.role || 'user'}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleStartChat(userProfile.id, userProfile.full_name || 'User')}
                        className="relative flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        aria-label={`Message ${userProfile.full_name || 'User'}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {unreadMessages[userProfile.id] > 0 && (
                          <div 
                            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full"
                          >
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


