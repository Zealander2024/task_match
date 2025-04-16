import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { JobPost } from '../types/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Briefcase, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Pagination } from './ui/Pagination';

interface JobPostsListProps {
  onJobSelect: (jobId: string) => void;
}

export function JobPostsList({ onJobSelect }: JobPostsListProps) {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchJobPosts();
  }, [currentPage]);

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (countError) throw countError;
      setTotalJobs(count || 0);

      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching job posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className="text-center py-8">Loading job posts...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Available Jobs</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-4">
                {job.company_logo_url ? (
                  <img
                    src={job.company_logo_url}
                    alt={job.company_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <p className="text-sm text-gray-500">{job.company_name}</p>
                </div>
              </div>
              <Badge variant="secondary">{job.job_type}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {job.location}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {job.budget}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {job.work_schedule}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(job.start_date), 'MMM d, yyyy')} - {format(new Date(job.end_date), 'MMM d, yyyy')}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.required_skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onJobSelect?.(job)}
                  >
                    View Details
                  </Button>
                </div>
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
      />
    </div>
  );
} 
