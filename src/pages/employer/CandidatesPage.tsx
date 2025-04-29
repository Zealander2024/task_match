import * as React from 'react';
import { useState, useEffect } from 'react';
import { CandidatesList } from '../../components/CandidatesList';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, User, Briefcase, CheckCircle, Filter, X } from 'lucide-react';

export function EmployerCandidatesPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCandidates: 0,
    appliedCandidates: 0,
    matchedSkills: 0,
    recentApplications: 0
  });
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'applied'>('all');
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchCandidateStats();
      fetchAvailableSkills();
    }
  }, [user]);
  
  const fetchCandidateStats = async () => {
    try {
      setLoading(true);
      
      // Get employer's job posts
      const { data: jobPosts, error: jobError } = await supabase
        .from('job_posts')
        .select('id, required_skills')
        .eq('employer_id', user?.id);
      
      if (jobError) throw jobError;
      
      // Get all unique job post IDs
      const jobPostIds = jobPosts?.map(post => post.id) || [];
      
      // Get job applications for these posts
      const { data: applications, error: appError } = await supabase
        .from('job_applications')
        .select('job_seeker_id, created_at')
        .in('job_post_id', jobPostIds);
      
      if (appError) throw appError;
      
      // Get all job seekers
      const { data: candidates, error: candError } = await supabase
        .from('profiles')
        .select('id, skills')
        .eq('role', 'job_seeker');
      
      if (candError) throw candError;
      
      // Get unique job seeker IDs who applied
      const uniqueApplicants = Array.from(new Set(applications?.map(app => app.job_seeker_id) || []));
      
      // Get recent applications (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentApps = applications?.filter(app => 
        new Date(app.created_at) >= oneWeekAgo
      ) || [];
      
      // Count candidates with matching skills
      let matchedCount = 0;
      
      // Flatten all required skills from job posts
      const allRequiredSkills = jobPosts?.flatMap(post => post.required_skills || []) || [];
      
      // Count candidates with at least one matching skill
      candidates?.forEach(candidate => {
        const candidateSkills = candidate.skills || [];
        if (candidateSkills.some(skill => allRequiredSkills.includes(skill))) {
          matchedCount++;
        }
      });
      
      setStats({
        totalCandidates: candidates?.length || 0,
        appliedCandidates: uniqueApplicants.length,
        matchedSkills: matchedCount,
        recentApplications: Array.from(new Set(recentApps.map(app => app.job_seeker_id))).length
      });
      
    } catch (error) {
      console.error('Error fetching candidate stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableSkills = async () => {
    try {
      // Get employer's job posts to find required skills
      const { data: jobPosts, error: jobError } = await supabase
        .from('job_posts')
        .select('required_skills')
        .eq('employer_id', user?.id);
      
      if (jobError) throw jobError;
      
      // Extract unique skills from all job posts
      const skills = Array.from(new Set(jobPosts?.flatMap(post => post.required_skills || [])));
      setAvailableSkills(skills);
      
    } catch (error) {
      console.error('Error fetching available skills:', error);
    }
  };
  
  const handleSkillSelect = (skill: string) => {
    setSkillFilter(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill]
    );
  };
  
  const clearFilters = () => {
    setSkillFilter([]);
    setSearchTerm('');
    setFilterMode('all');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Talent Pool</h1>
          <p className="mt-2 text-gray-600">Find and connect with qualified candidates for your job postings</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Candidates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Applied</p>
              <p className="text-2xl font-bold text-blue-600">{stats.appliedCandidates}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Skill Matches</p>
              <p className="text-2xl font-bold text-green-600">{stats.matchedSkills}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Recent (7 days)</p>
              <p className="text-2xl font-bold text-purple-600">{stats.recentApplications}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select
                value={filterMode}
                onValueChange={(value: 'all' | 'applied') => setFilterMode(value)}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter By" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidates</SelectItem>
                  <SelectItem value="applied">Applied Candidates</SelectItem>
                </SelectContent>
              </Select>
              
              {(skillFilter.length > 0 || searchTerm || filterMode !== 'all') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Skills Filter */}
          {availableSkills.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Filter by Skills</p>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant={skillFilter.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleSkillSelect(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced CandidatesList with filters passed */}
        <CandidatesList 
          filter={filterMode}
          searchTerm={searchTerm}
          selectedSkills={skillFilter}
        />
      </div>
    </div>
  );
}
