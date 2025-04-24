import { useState, useEffect, useCallback } from 'react';
import { JobPostsList } from './JobPostsList';
import { JobPostDialog } from './JobPostDialog';
import { SavedJobsDialog } from './SavedJobsDialog';
import { Card } from './ui/card';
import { Root as Tabs, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';
import { Briefcase, BookMarked, Clock, Trophy, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from './ui/use-toast';
import { Button } from './ui/button';

export function JobSeekerDashboard() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedJobsDialogOpen, setSavedJobsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    applied: 0,
    saved: 0,
    pending: 0,
    interviews: 0,
    availableJobs: 0
  });
  const [loading, setLoading] = useState(true);

  // Add this function to refresh stats
  const refreshStats = useCallback(() => {
    fetchDashboardStats();
  }, [user]);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { count: availableCount } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: appliedCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id);

      const { count: savedCount } = await supabase
        .from('saved_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id);

      const { count: pendingCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id)
        .eq('status', 'pending');

      const { count: interviewCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id)
        .eq('status', 'interviewing');

      setStats({
        applied: appliedCount || 0,
        saved: savedCount || 0,
        pending: pendingCount || 0,
        interviews: interviewCount || 0,
        availableJobs: availableCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = async (jobId: string) => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      if (jobData.employer_id) {
        const { data: employerData, error: employerError } = await supabase
          .from('users')
          .select('full_name, company_name, avatar_url')
          .eq('id', jobData.employer_id)
          .single();

        if (employerError) {
          console.error('Error fetching employer details:', employerError);
        } else {
          jobData.employer = employerData;
        }
      }

      setSelectedJob(jobData);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job details',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg skeleton-loading" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied Jobs</p>
                <p className="text-2xl font-semibold">{stats.applied}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setSavedJobsDialogOpen(true)}>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookMarked className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-grow">
                <p className="text-sm text-gray-500">Saved Jobs</p>
                <p className="text-2xl font-semibold">{stats.saved}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setSavedJobsDialogOpen(true);
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Interviews</p>
                <p className="text-2xl font-semibold">{stats.interviews}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="available" className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="w-full justify-start space-x-4 border-b">
              <TabsTrigger value="available">Available Jobs</TabsTrigger>
              <TabsTrigger value="applied">Applied Jobs</TabsTrigger>
              <TabsTrigger value="saved">Saved Jobs</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="available">
              <JobPostsList 
                onJobSelect={handleJobSelect}
                userId={user?.id}
                onSaveStateChange={refreshStats}
              />
            </TabsContent>

            <TabsContent value="applied">
              <JobPostsList 
                onJobSelect={handleJobSelect} 
                filter="applied"
                userId={user?.id}
                onSaveStateChange={refreshStats}
              />
            </TabsContent>

            <TabsContent value="saved">
              <JobPostsList 
                onJobSelect={handleJobSelect} 
                filter="saved"
                userId={user?.id}
                onSaveStateChange={refreshStats}
              />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <JobPostDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <SavedJobsDialog
        open={savedJobsDialogOpen}
        onOpenChange={setSavedJobsDialogOpen}
        onJobSelect={handleJobSelect}
        onSaveStateChange={refreshStats}
      />
    </div>
  );
} 



















