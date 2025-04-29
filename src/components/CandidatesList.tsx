import * as React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Phone, Briefcase, User, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  full_name: string;
  work_email: string;
  skills: string[];
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  has_applied?: boolean;
  application_count?: number;
  latest_application_date?: string;
  email?: string;
  contact_number?: string;
}

interface CandidatesListProps {
  filter?: 'all' | 'applied';
  searchTerm?: string;
  selectedSkills?: string[];
}

export function CandidatesList({ filter = 'all', searchTerm = '', selectedSkills = [] }: CandidatesListProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSkills, setAllSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, [filter]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);

      // First, get all job applications for the employer's job posts
      const { data: employerJobPosts, error: jobPostsError } = await supabase
        .from('job_posts')
        .select('id')
        .eq('employer_id', user?.id);

      if (jobPostsError) throw jobPostsError;

      const jobPostIds = employerJobPosts?.map(post => post.id) || [];

      // Get all applicants for these job posts
      const { data: applications, error: applicationsError } = await supabase
        .from('job_applications')
        .select(`
          job_seeker_id,
          created_at,
          job_post_id,
          email,
          contact_number
        `)
        .in('job_post_id', jobPostIds);

      if (applicationsError) throw applicationsError;

      // Create a map of job seeker IDs to their application details
      const applicantMap = applications?.reduce((acc, app) => {
        if (!acc[app.job_seeker_id]) {
          acc[app.job_seeker_id] = {
            count: 1,
            latest_date: app.created_at,
            email: app.email,
            contact_number: app.contact_number
          };
        } else {
          acc[app.job_seeker_id].count++;
          if (app.created_at > acc[app.job_seeker_id].latest_date) {
            acc[app.job_seeker_id].latest_date = app.created_at;
            acc[app.job_seeker_id].email = app.email;
            acc[app.job_seeker_id].contact_number = app.contact_number;
          }
        }
        return acc;
      }, {} as Record<string, { 
        count: number; 
        latest_date: string; 
        email: string; 
        contact_number?: string 
      }>);

      const applicantIds = Object.keys(applicantMap);

      // Fetch profiles based on filter
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          work_email,
          skills,
          avatar_url,
          bio,
          is_verified
        `)
        .eq('role', 'job_seeker');

      if (filter === 'applied') {
        query = query.in('id', applicantIds);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Combine profiles with application data
      const enrichedCandidates = profiles?.map(profile => ({
        ...profile,
        has_applied: applicantIds.includes(profile.id),
        application_count: applicantMap[profile.id]?.count || 0,
        latest_application_date: applicantMap[profile.id]?.latest_date,
        email: applicantMap[profile.id]?.email || profile.work_email,
        contact_number: applicantMap[profile.id]?.contact_number
      }));

      setCandidates(enrichedCandidates || []);

      // Extract unique skills
      const skills = profiles?.reduce((acc: string[], candidate) => {
        candidate.skills?.forEach(skill => {
          if (!acc.includes(skill)) {
            acc.push(skill);
          }
        });
        return acc;
      }, []);
      setAllSkills(skills || []);

    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    // Filter by search term
    const matchesSearch = searchTerm 
      ? candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Filter by selected skills
    const matchesSkills = selectedSkills.length === 0 || 
      selectedSkills.some(skill => candidate.skills?.includes(skill));

    return matchesSearch && matchesSkills;
  });

  const handleContact = async (candidateId: string, type: 'email' | 'phone') => {
    try {
      // Log the contact attempt
      await supabase.from('candidate_contacts').insert({
        employer_id: user?.id,
        candidate_id: candidateId,
        contact_type: type,
      });

      toast.success(`Contact information accessed for ${type}`);
    } catch (error) {
      console.error('Error logging contact:', error);
      toast.error('Failed to log contact attempt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (filteredCandidates.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
        <div className="flex flex-col items-center max-w-md mx-auto">
          <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">No Candidates Found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'applied' 
              ? "No candidates have applied to your job postings yet."
              : "No candidates match your current search criteria. Try adjusting your filters."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCandidates.map((candidate) => (
        <div key={candidate.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            {candidate.avatar_url ? (
              <img 
                src={candidate.avatar_url} 
                alt={candidate.full_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{candidate.full_name}</h3>
              {candidate.is_verified && (
                <Badge variant="secondary" className="mt-1">Verified</Badge>
              )}
            </div>
          </div>
          
          {candidate.bio && (
            <p className="text-gray-700 text-sm mb-4 line-clamp-2">{candidate.bio}</p>
          )}
          
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 5).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {candidate.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidate.skills.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => handleContact(candidate.id, 'email')}
            >
              <Mail className="h-4 w-4 mr-2 text-blue-500" />
              {candidate.email}
            </Button>
            
            {candidate.contact_number && (
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start"
                onClick={() => handleContact(candidate.id, 'phone')}
              >
                <Phone className="h-4 w-4 mr-2 text-green-500" />
                {candidate.contact_number}
              </Button>
            )}
          </div>
          
          {candidate.has_applied && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-600">
                <Briefcase className="h-4 w-4 mr-2 text-blue-500" />
                <span>
                  Applied to {candidate.application_count} {candidate.application_count === 1 ? 'job' : 'jobs'}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}






