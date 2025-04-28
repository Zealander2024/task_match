import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, UserPlus, UserCheck, MessageCircle, X, Bell } from 'lucide-react';
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

interface MessageNotification {
  conversationId: string;
  senderId: string;
  unreadCount: number;
  lastMessageTime: string;
}

export function UsersSidebar({ onClose }: UsersSidebarProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(users.length / usersPerPage);
  const paginatedUsers = users.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  useEffect(() => {
    if (!user) return;

    const fetchUserRole = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserRole(data.role);
      }
    };

    fetchUserRole();
  }, [user]);

  const fetchUnreadMessages = async () => {
    if (!user) return;

    try {
      // Fetch conversations where the user is either user1 or user2
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          messages!inner(
            id,
            sender_id,
            read,
            created_at
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { foreignTable: 'messages', ascending: false });

      if (convError) throw convError;

      const newUnreadMessages: Record<string, number> = {};

      conversations?.forEach(conv => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const unreadCount = conv.messages.filter(
          msg => msg.sender_id !== user.id && !msg.read
        ).length;

        if (unreadCount > 0) {
          newUnreadMessages[otherUserId] = unreadCount;
        }
      });

      setUnreadMessages(newUnreadMessages);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, created_at, bio')
        .neq('id', user?.id);

      // Only apply role filtering if showAllUsers is false
      if (!showAllUsers) {
        if (userRole === 'employer') {
          query = query.eq('role', 'job_seeker');
        } else if (userRole === 'job_seeker') {
          query = query.eq('role', 'employer');
        }
      }

      const { data: usersData, error: usersError } = await query
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Remove this condition since empty array is valid
      // if (!usersData || usersData.length === 0) {
      //   console.log('No users found');
      //   setError('No users found');
      // }

      setUsers(usersData || []);

      // Fetch following data
      if (user) {
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) throw followingError;
        setFollowing(new Set(followingData?.map(f => f.following_id) || []));
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
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
    fetchUnreadMessages();

    // Set up realtime subscriptions
    const messagesChannel = supabase.channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.recipient_id === user?.id && !newMessage.read) {
            setUnreadMessages(prev => ({
              ...prev,
              [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    const profilesChannel = supabase.channel('profiles-changes')
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
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user, userRole, showAllUsers]);

  const markMessagesAsRead = async (senderId: string) => {
    if (!user) return;

    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${senderId}),and(user1_id.eq.${senderId},user2_id.eq.${user.id})`)
        .single();

      if (conversations) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversations.id)
          .eq('recipient_id', user.id)
          .eq('read', false);

        setUnreadMessages(prev => {
          const next = { ...prev };
          delete next[senderId];
          return next;
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {userRole === 'employer' ? 'Job Seekers' : 'Employers'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Show all users</span>
            <button
              role="switch"
              aria-checked={showAllUsers}
              onClick={() => setShowAllUsers(!showAllUsers)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                showAllUsers ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">
                {showAllUsers ? 'Show filtered users' : 'Show all users'}
              </span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-lg ${
                  showAllUsers ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedUsers.map((userProfile) => (
                <div 
                  key={userProfile.id} 
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
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
                        {unreadMessages[userProfile.id] && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                            {unreadMessages[userProfile.id]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userProfile.full_name || 'Anonymous User'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize mt-1">
                        {userProfile.role}
                      </p>
                      {userProfile.bio && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {userProfile.bio}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                markMessagesAsRead(userProfile.id);
                                handleStartChat(userProfile.id, userProfile.full_name || 'User');
                              }}
                              className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <MessageCircle className="h-4 w-4" />
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
                          className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

