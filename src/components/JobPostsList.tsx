import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { JobPost } from '../types/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Briefcase, DollarSign, Clock, ExternalLink, Search, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Pagination } from './ui/Pagination';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';

interface JobPostsListProps {
  onJobSelect: (jobId: string) => void;
  filter?: 'applied' | 'saved';
  userId?: string;
  onSaveStateChange?: () => void;  // Add this prop
}

export function JobPostsList({ onJobSelect, filter, userId, onSaveStateChange }: JobPostsListProps) {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const itemsPerPage = 10;

  useEffect(() => {
    fetchJobPosts();
    if (userId) {
      fetchSavedJobs();
    }
  }, [currentPage, filter, userId, searchQuery]);

  const fetchSavedJobs = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('job_seeker_id', userId);

      if (error) throw error;

      setSavedJobs(new Set(data.map(item => item.job_id)));
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save jobs",
        variant: "destructive",
      });
      return;
    }

    try {
      if (savedJobs.has(jobId)) {
        // Unsave job
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('job_seeker_id', userId)
          .eq('job_id', jobId);

        if (error) {
          console.error('Delete error:', error);
          throw new Error(error.message);
        }

        setSavedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });

        toast({
          title: "Job removed from saved jobs",
          variant: "default",
        });
      } else {
        // Save job
        const { error } = await supabase
          .from('saved_jobs')
          .insert([
            {
              job_seeker_id: userId,
              job_id: jobId,
            },
          ]);

        if (error) {
          console.error('Insert error:', error);
          throw new Error(error.message);
        }

        setSavedJobs(prev => new Set([...prev, jobId]));

        toast({
          title: "Job saved successfully",
          variant: "default",
        });
      }

      // Call the onSaveStateChange callback after successful save/unsave
      onSaveStateChange?.();
      
    } catch (err) {
      console.error('Error saving/unsaving job:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save/unsave job",
        variant: "destructive",
      });
    }
  };

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('job_posts')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Apply search filter if query exists
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%,required_skills.cs.{${searchQuery}}`);
      }

      // Apply filters for applied/saved jobs
      if (filter === 'applied' && userId) {
        const { data: appliedJobIds } = await supabase
          .from('job_applications')
          .select('job_id')
          .eq('job_seeker_id', userId);
          
        query = query.in('id', appliedJobIds?.map(item => item.job_id) || []);
      } else if (filter === 'saved' && userId) {
        const { data: savedJobIds } = await supabase
          .from('saved_jobs')
          .select('job_id')
          .eq('job_seeker_id', userId);
          
        query = query.in('id', savedJobIds?.map(item => item.job_id) || []);
      }

      // Get total count
      const { count } = await query;
      setTotalJobs(count || 0);

      // Get paginated results
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching job posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Jobs</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <div className="text-red-800 font-medium">Error loading jobs</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Available Jobs</h2>
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card 
            key={job.id} 
            className="group hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 hover:border-primary/20"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start space-x-4">
                {job.company_logo_url ? (
                  <img
                    src={job.company_logo_url}
                    alt={job.company_name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Briefcase className="w-6 h-6 text-primary/60" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {job.title}
                  </CardTitle>
                  <p className="text-sm text-gray-500 line-clamp-1">{job.company_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${savedJobs.has(job.id) ? 'text-primary' : 'text-gray-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveJob(job.id);
                  }}
                >
                  {savedJobs.has(job.id) ? (
                    <BookmarkCheck className="h-5 w-5" />
                  ) : (
                    <BookmarkPlus className="h-5 w-5" />
                  )}
                </Button>
                <Badge variant="secondary" className="whitespace-nowrap text-xs font-medium">
                  {job.job_type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="line-clamp-1">{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="line-clamp-1">{job.budget}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="line-clamp-1">{job.work_schedule}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="line-clamp-1">
                      {format(new Date(job.start_date), 'MMM d')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {job.required_skills.slice(0, 3).map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-primary/5"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {job.required_skills.length > 3 && (
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-primary/5"
                    >
                      +{job.required_skills.length - 3}
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4 group-hover:bg-primary group-hover:text-black transition-colors"
                  onClick={() => {
                    console.log('Selected job:', job); // Add debug logging
                    onJobSelect?.(job.id);
                  }}
                >
                  <span>View Details</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalJobs / itemsPerPage)}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={totalJobs}
        className="mt-8"
      />
    </div>
  );
} 















