import { useState, useEffect } from 'react';
import { JobSearch } from './JobSearch';
import { JobPostsList } from './JobPostsList';
import { JobPostDialog } from './JobPostDialog';
import { Card } from './ui/card';
import { Root as Tabs, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';
import { Badge } from './ui/badge';
import { Briefcase, BookMarked, Clock, Trophy } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export function JobSeekerDashboard() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    applied: 0,
    saved: 0,
    pending: 0,
    interviews: 0,
    availableJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch total available active jobs
      const { count: availableCount } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch applied jobs count
      const { count: appliedCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id);

      // Fetch saved jobs count
      const { count: savedCount } = await supabase
        .from('saved_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id);

      // Fetch pending applications count
      const { count: pendingCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_seeker_id', user.id)
        .eq('status', 'pending');

      // Fetch interview count (applications with status 'interviewing')
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

  const handleJobSelect = (job: any) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
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

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <BookMarked className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Saved Jobs</p>
              <p className="text-2xl font-semibold">{stats.saved}</p>
            </div>
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

      {/* Main Content */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="available" className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="w-full justify-start space-x-4 border-b">
              <TabsTrigger value="available" className="relative">
                Available Jobs
                <Badge className="ml-2 bg-blue-100 text-blue-700">
                  {stats.availableJobs}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="applied" className="relative">
                Applied
                <Badge className="ml-2 bg-green-100 text-green-700">
                  {stats.applied}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="saved" className="relative">
                Saved
                <Badge className="ml-2 bg-yellow-100 text-yellow-700">
                  {stats.saved}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <JobSearch 
              className="mb-6"
              onSearch={(params) => console.log('Search params:', params)} 
            />

            <TabsContent value="available">
              <JobPostsList onJobSelect={handleJobSelect} />
            </TabsContent>

            <TabsContent value="applied">
              <JobPostsList 
                onJobSelect={handleJobSelect} 
                filter="applied"
                userId={user?.id}
              />
            </TabsContent>

            <TabsContent value="saved">
              <JobPostsList 
                onJobSelect={handleJobSelect} 
                filter="saved"
                userId={user?.id}
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
    </div>
  );
} 






