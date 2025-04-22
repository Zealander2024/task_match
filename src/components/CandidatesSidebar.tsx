import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Candidate {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  bio: string | null;
}

export function CandidatesSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
    fetchFollowing();
  }, [user]);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, bio')
        .eq('role', 'job_seeker')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowing(new Set(data?.map(f => f.following_id) || []));
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  };

  const handleFollow = async (candidateId: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      if (following.has(candidateId)) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', candidateId);

        setFollowing(prev => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert([
            { follower_id: user.id, following_id: candidateId }
          ]);

        setFollowing(prev => new Set([...prev, candidateId]));
      }
    } catch (err) {
      console.error('Error updating follow status:', err);
    }
  };

  const handleMessage = async (candidateId: string, candidateName: string) => {
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
        .or(`user1_id.eq.${candidateId},user2_id.eq.${candidateId}`)
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
            user2_id: candidateId,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) throw createError;
        conversationId = newConversation.id;
      }

      navigate(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Job Seekers</h2>
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {candidate.avatar_url ? (
                      <img
                        src={candidate.avatar_url}
                        alt={candidate.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {candidate.full_name}
                  </p>
                  {candidate.bio && (
                    <p className="text-xs text-gray-500 truncate">
                      {candidate.bio}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex space-x-2">
                  <button
                    onClick={() => handleMessage(candidate.id, candidate.full_name)}
                    className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleFollow(candidate.id)}
                    className={`p-1.5 rounded-full ${
                      following.has(candidate.id)
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {following.has(candidate.id) ? (
                      <UserCheck className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



