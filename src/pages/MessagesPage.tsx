import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { User, Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { Smile, Paperclip, Image } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  last_message?: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

// Add this to the component props
interface MessagesPageProps {
  selectedConversationId?: string;
}

export function MessagesPage({ selectedConversationId }: MessagesPageProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(selectedConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const navigate = useNavigate();

  const onEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchConversations = async () => {
      try {
        // Fetch conversations without trying to join with profiles
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            id,
            user1_id,
            user2_id,
            last_message_at,
            last_message
          `)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('last_message_at', { ascending: false });

        if (conversationsError) throw conversationsError;

        if (conversationsData && conversationsData.length > 0) {
          // Get all user IDs that we need to fetch (excluding current user)
          const userIds = conversationsData.flatMap(conv => 
            [conv.user1_id, conv.user2_id].filter(id => id !== user.id)
          );
          
          // Fetch profiles for these users
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', [...new Set(userIds)]);
            
          if (profilesError) throw profilesError;
          
          // Transform data to include the other user's info
          const transformedData = conversationsData.map(conv => {
            const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
            const otherUser = profilesData?.find(profile => profile.id === otherUserId);
            
            return {
              id: conv.id,
              user1_id: conv.user1_id,
              user2_id: conv.user2_id,
              last_message_at: conv.last_message_at,
              last_message: conv.last_message,
              other_user: otherUser || { id: otherUserId, full_name: 'Unknown User', avatar_url: '' }
            };
          });

          setConversations(transformedData);
        } else {
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to new conversations
    const conversationsSubscription = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(user1_id=eq.${user.id},user2_id=eq.${user.id})`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsSubscription);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      try {
        // Modified query to avoid using the foreign key relationship
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            created_at
          `)
          .eq('conversation_id', selectedConversation)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        
        // If we have messages, fetch the sender profiles separately
        if (messagesData && messagesData.length > 0) {
          // Get unique sender IDs
          const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
          
          // Fetch profiles for these senders
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', senderIds);
            
          if (profilesError) throw profilesError;
          
          // Map profiles to messages
          const messagesWithSenders = messagesData.map(message => {
            const senderProfile = profilesData?.find(profile => profile.id === message.sender_id);
            return {
              ...message,
              sender: senderProfile ? {
                full_name: senderProfile.full_name,
                avatar_url: senderProfile.avatar_url
              } : undefined
            };
          });
          
          setMessages(messagesWithSenders);
        } else {
          setMessages([]);
        }

        // Scroll to bottom of messages
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        (payload) => {
          // Fetch the sender info for the new message
          const fetchSender = async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();

            if (!error && data) {
              const newMessage = {
                ...payload.new,
                sender: data
              };
              setMessages(prev => [...prev, newMessage as Message]);

              // Scroll to bottom
              setTimeout(() => {
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
              }, 100);
            }
          };

          fetchSender();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [selectedConversation]);

  // Update useEffect to handle the selectedConversationId
  useEffect(() => {
    if (selectedConversationId) {
      setSelectedConversation(selectedConversationId);
    }
  }, [selectedConversationId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      // Insert the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (messageError) throw messageError;

      // Update the conversation's last message and timestamp
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConversation);

      if (conversationError) throw conversationError;

      // Clear the input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Conversations sidebar */}
      <div className={`w-80 border-r border-gray-200 bg-white ${selectedConversation ? 'hidden md:block' : 'block'}`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100%-57px)]">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
              <User className="h-12 w-12 text-gray-300 mb-2" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start chatting with users from the suggested users list</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedConversation === conversation.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {conversation.other_user.avatar_url ? (
                        <img
                          src={conversation.other_user.avatar_url}
                          alt={conversation.other_user.full_name || 'User'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.other_user.full_name || 'Anonymous User'}
                      </p>
                    </div>
                    {conversation.last_message && (
                      <p className="text-xs text-gray-500 truncate">{conversation.last_message}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <button
                className="md:hidden mr-2"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {conversations.find(c => c.id === selectedConversation)?.other_user && (
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {conversations.find(c => c.id === selectedConversation)?.other_user.avatar_url ? (
                      <img
                        src={conversations.find(c => c.id === selectedConversation)?.other_user.avatar_url}
                        alt={conversations.find(c => c.id === selectedConversation)?.other_user.full_name || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {conversations.find(c => c.id === selectedConversation)?.other_user.full_name || 'User'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              id="messages-container"
              className="flex-1 p-4 overflow-y-auto bg-gray-50"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation by sending a message</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[70%] ${message.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                        {message.sender_id !== user?.id && (
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden">
                            {message.sender?.avatar_url ? (
                              <img
                                src={message.sender.avatar_url}
                                alt={message.sender.full_name || 'User'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-lg p-3 ${
                            message.sender_id === user?.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-800'
                          }`}
                        >
                          {/* Remove references to undefined properties and components */}
                          <p className="text-sm">{message.content}</p>
                          
                          <p className={`text-xs mt-1 ${message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Smile className="h-5 w-5 text-gray-500" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0">
                      <Picker
                        data={data}
                        onEmojiSelect={onEmojiSelect}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
                
                <Input
                  type="text"
                  placeholder="Type your message.."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="h-10 w-10 p-0"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="bg-gray-100 p-8 rounded-full mb-4">
              <MessageCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">Your Messages</h3>
            <p className="text-center max-w-md">
              Select a conversation from the sidebar or start a new one by clicking the message icon next to a user.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
