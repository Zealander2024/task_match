import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MessagesPage } from './MessagesPage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !conversationId) return;

    // Verify the user is part of this conversation
    const checkConversation = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('id', conversationId)
        .single();

      if (error || !data) {
        // User is not part of this conversation, redirect to messages
        navigate('/messages');
      }
    };

    checkConversation();
  }, [conversationId, user, navigate]);

  // Pass the selected conversation ID to MessagesPage
  return <MessagesPage selectedConversationId={conversationId} />;
}