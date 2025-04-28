import React, { useState, useEffect } from 'react';
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
  // Removed location as it doesn't exist in the database
}

export function CandidatesList() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'applied'>('all');

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
    // Update search to only look for name matches
    const matchesSearch = candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkills = selectedSkills.length === 0 || 
      selectedSkills.every(skill => candidate.skills?.includes(skill));

    return matchesSearch && matchesSkills;
  });

  const handleSkillClick = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Candidates
          </Button>
          <Button
            variant={filter === 'applied' ? 'default' : 'outline'}
            onClick={() => setFilter('applied')}
          >
            Applied Candidates
          </Button>
        </div>

        {allSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill) => (
              <Badge
                key={skill}
                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleSkillClick(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>

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
              <p className="text-sm text-gray-600 mb-4">{candidate.bio}</p>
            )}

            {candidate.skills && candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {candidate.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">{skill}</Badge>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleContact(candidate.id, 'email')}
                title={candidate.work_email}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              {candidate.contact_number && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleContact(candidate.id, 'phone')}
                  title={candidate.contact_number}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}






