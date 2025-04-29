import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  Download,
  Clock,
  Filter,
  Search,
  Briefcase,
  X,
  ChevronLeft,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

interface JobApplication {
  id: string;
  job_post_id: string;
  job_seeker_id: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  resume_url: string | null;
  cover_letter: string | null;
  contact_number: string | null;
  email: string;
  created_at: string;
  job_post: {
    id: string;
    title: string;
    required_skills: string[];
  };
  job_seeker: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function ApplicationsPage() {
  const { jobId } = useParams<{ jobId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>(jobId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedCoverLetters, setExpandedCoverLetters] = useState<{ [key: string]: boolean }>({});
  
  // Computed value for total number of applications
  const totalJobs = applications.length;

  useEffect(() => {
    fetchJobs();
    fetchApplications();

    // Set up real-time subscription for application updates
    if (user?.id) {
      // First get this employer's job IDs
      const setupSubscription = async () => {
        try {
          const { data: jobPosts, error } = await supabase
            .from('job_posts')
            .select('id')
            .eq('employer_id', user.id);
          
          // Handle case where jobPosts is null, empty, or there was an error
          if (error) {
            console.error('Error fetching job posts for subscription:', error.message);
            return null;
          }
          
          if (!jobPosts || jobPosts.length === 0) {
            console.log('No job posts found for subscription. Skipping subscription setup.');
            return null;
          }
          
          const jobIds = jobPosts.map(job => job.id);
          console.log(`Setting up real-time subscription for ${jobIds.length} job posts`);
          
          // Now subscribe to changes on applications for these jobs
          const subscription = supabase
            .channel('employer_applications_changes')
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'job_applications',
              filter: `job_post_id=in.(${jobIds.join(',')})`,
            }, (payload) => {
              console.log('Received real-time update for application:', payload.new.id);
              setApplications(prev => 
                prev.map(app => app.id === payload.new.id ? { ...app, ...payload.new } : app)
              );
            })
            .subscribe((status) => {
              console.log(`Subscription status: ${status}`);
            });
          
          return () => {
            console.log('Cleaning up real-time subscription');
            supabase.removeChannel(subscription);
          };
        } catch (err) {
          console.error('Error in subscription setup:', err);
          return null;
        }
      };
      
      const cleanup = setupSubscription();
      return () => {
        if (cleanup) {
          cleanup.then(cleanupFn => {
            if (cleanupFn) cleanupFn();
          }).catch(err => {
            console.error('Error during subscription cleanup:', err);
          });
        }
      };
    }
  }, [user?.id, jobId]);

  useEffect(() => {
    // Apply filters
    let filtered = applications;

    // Filter by job
    if (selectedJob && selectedJob !== 'all') {
      filtered = filtered.filter(app => app.job_post_id === selectedJob);
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        app =>
          app.job_seeker.full_name.toLowerCase().includes(query) ||
          app.job_seeker.email.toLowerCase().includes(query) ||
          app.job_post.title.toLowerCase().includes(query) ||
          (app.contact_number && app.contact_number.includes(query))
      );
    }

    setFilteredApplications(filtered);
  }, [applications, selectedJob, statusFilter, searchQuery]);

  const fetchJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast({
        title: 'Error',
        description: 'Failed to load your jobs.',
        variant: 'destructive',
      });
    }
  };

  const fetchApplications = async () => {
    if (!user) return;

    try {
      setLoadingInitial(true);
      
      // First, get all the employer's job IDs
      let jobIds: string[] = [];
      
      if (jobId) {
        // If a specific job ID is provided, use only that
        jobIds = [jobId];
        setSelectedJob(jobId);
      } else {
        // Otherwise get all the employer's job IDs
        const { data: jobPosts, error: jobError } = await supabase
          .from('job_posts')
          .select('id')
          .eq('employer_id', user.id);
        
        if (jobError) throw jobError;
        
        if (!jobPosts || jobPosts.length === 0) {
          // If employer has no jobs, return empty result
          setApplications([]);
          setFilteredApplications([]);
          setLoadingInitial(false);
          return;
        }
        
        jobIds = jobPosts.map(job => job.id);
      }
      
      // Fetch applications for these job IDs
      const { data: applicationData, error: applicationsError } = await supabase
        .from('job_applications')
        .select(`
          id,
          job_post_id,
          job_seeker_id,
          status,
          resume_url,
          cover_letter,
          contact_number,
          email,
          created_at
        `)
        .in('job_post_id', jobIds)
        .order('created_at', { ascending: false });
      
      if (applicationsError) throw applicationsError;
      
      // Avoid using Set and use a manual approach to get unique IDs
      const getUniqueIds = (applications: any[], keyField: string): string[] => {
        const uniqueIds: { [key: string]: boolean } = {};
        applications?.forEach(app => {
          if (app[keyField]) {
            uniqueIds[app[keyField]] = true;
          }
        });
        return Object.keys(uniqueIds);
      };

      // Use the helper function to get unique IDs
      const jobPostIds = getUniqueIds(applicationData || [], 'job_post_id');
      const jobSeekerIds = getUniqueIds(applicationData || [], 'job_seeker_id');
      
      // Fetch job posts
      const { data: jobPostsData, error: jobPostsError } = await supabase
        .from('job_posts')
        .select('id, title, required_skills, employer_id')
        .in('id', jobPostIds);
      
      if (jobPostsError) throw jobPostsError;
      
      // Fetch job seekers
      const { data: jobSeekersData, error: jobSeekersError } = await supabase
        .from('job_seekers')
        .select('id, full_name, email')
        .in('id', jobSeekerIds);
      
      if (jobSeekersError) throw jobSeekersError;
      
      // Create maps for quick lookups
      const jobPostsMap = (jobPostsData || []).reduce((acc, job) => {
        acc[job.id] = job;
        return acc;
      }, {} as Record<string, any>);
      
      const jobSeekersMap = (jobSeekersData || []).reduce((acc, seeker) => {
        acc[seeker.id] = seeker;
        return acc;
      }, {} as Record<string, any>);
      
      // Combine data
      const combinedApplications = (applicationData || []).map(app => {
        const jobPost = jobPostsMap[app.job_post_id] || { 
          id: app.job_post_id, 
          title: 'Unknown Job', 
          required_skills: [],
          employer_id: user?.id || ''
        };
        
        const jobSeeker = jobSeekersMap[app.job_seeker_id] || { 
          id: app.job_seeker_id, 
          full_name: 'Unknown User', 
          email: app.email 
        };
        
        return {
          ...app,
          job_post: jobPost,
          job_seeker: jobSeeker
        };
      });
      
      // Set the applications state
      setApplications(combinedApplications as JobApplication[]);
      setFilteredApplications(combinedApplications as JobApplication[]);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast({
        title: 'Error',
        description: 'Failed to load applications.',
        variant: 'destructive',
      });
    } finally {
      setLoadingInitial(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      setProcessingId(applicationId);
      
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => 
        prev.map(app => app.id === applicationId ? { ...app, status: newStatus as any } : app)
      );

      toast({
        title: 'Status Updated',
        description: `Application status changed to ${newStatus}.`,
      });

      // Create notification for job seeker
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        await createStatusUpdateNotification(application, newStatus);
      }
    } catch (err) {
      console.error('Error updating application status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update application status.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const createStatusUpdateNotification = async (
    application: JobApplication, 
    newStatus: string
  ) => {
    try {
      await supabase.from('notifications').insert({
        user_id: application.job_seeker_id,
        type: 'application_status',
        message: `Your application for "${application.job_post.title}" has been ${newStatus}.`,
        metadata: {
          application_id: application.id,
          job_post_id: application.job_post_id,
          status: newStatus
        },
        read: false
      });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  const viewApplicationDetails = (application: JobApplication) => {
    setSelectedApplication(application);
    setIsDetailsOpen(true);
  };

  // Function to toggle expanded state for a specific application
  const toggleCoverLetter = (applicationId: string) => {
    setExpandedCoverLetters(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  if (loadingInitial) {
    return (
      <div className="h-[calc(100vh-200px)] flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 w-full max-w-md flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-blue-600 border-b-blue-600 border-l-transparent border-r-transparent animate-spin mb-4"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Applications</h3>
          <p className="text-gray-500 text-center">Please wait while we fetch your applications data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="ghost" 
          className="flex items-center text-gray-700 hover:text-blue-700 hover:bg-blue-50 pl-2"
          onClick={() => navigate('/employer/dashboard')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
      </div>

      {/* Enhanced Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-500 mt-1">Review and manage applications for your job postings</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">
              {totalJobs} Total Applications
            </span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-medium">
              {filteredApplications.filter(a => a.status === 'pending').length} Pending
            </Badge>
          </div>
        </div>

        {/* Enhanced Filters Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select
                value={selectedJob}
                onValueChange={(value) => setSelectedJob(value)}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="reviewing">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      Reviewing
                    </div>
                  </SelectItem>
                  <SelectItem value="accepted">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      Accepted
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                      Rejected
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(selectedJob !== 'all' || statusFilter !== 'all' || searchQuery) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedJob('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Application Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">{applications.filter(a => a.status === 'pending').length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Reviewing</p>
              <p className="text-2xl font-bold text-blue-500">{applications.filter(a => a.status === 'reviewing').length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Accepted</p>
              <p className="text-2xl font-bold text-green-500">{applications.filter(a => a.status === 'accepted').length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">All Applications {selectedJob !== 'all' && "for Selected Job"}</h2>
        
        {filteredApplications.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">No Applications Found</h3>
              <p className="text-gray-600 mb-6">
                {selectedJob !== 'all' || statusFilter !== 'all' || searchQuery
                  ? "No applications match your current filters. Try adjusting your search criteria."
                  : "You don't have any applications yet. Make sure your job postings are active and visible to potential candidates."}
              </p>
              <Button 
                onClick={() => {
                  setSelectedJob('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredApplications.map((application) => (
              <Card 
                key={application.id} 
                className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                {/* Status indicator bar */}
                <div 
                  className={`h-1.5 ${
                    application.status === 'pending' ? 'bg-yellow-500' : 
                    application.status === 'reviewing' ? 'bg-blue-500' : 
                    application.status === 'accepted' ? 'bg-green-500' : 
                    'bg-red-500'
                  }`}
                ></div>
                
                <CardHeader className="pb-2 pt-5">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {application.job_seeker.full_name}
                      </CardTitle>
                      <CardDescription className="text-blue-600 font-medium mt-1">
                        Application for {application.job_post.title}
                      </CardDescription>
                    </div>

                    <Badge 
                      className={`px-3 py-1.5 text-white 
                        ${application.status === 'pending' ? 'bg-yellow-500' : 
                        application.status === 'reviewing' ? 'bg-blue-500' : 
                        application.status === 'accepted' ? 'bg-green-500' : 
                        'bg-red-500'}
                        flex items-center gap-1.5 shadow-sm`}
                    >
                      {application.status === 'pending' && <AlertCircle className="h-3.5 w-3.5" />}
                      {application.status === 'reviewing' && <Clock className="h-3.5 w-3.5" />}
                      {application.status === 'accepted' && <CheckCircle className="h-3.5 w-3.5" />}
                      {application.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-gray-700">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm truncate">{application.email}</span>
                    </div>
                    {application.contact_number && (
                      <div className="flex items-center text-gray-700">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">{application.contact_number}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  {application.cover_letter && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        Cover Letter
                      </h4>
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {application.cover_letter.length > 200 
                          ? (
                            <>
                              {expandedCoverLetters[application.id] 
                                ? application.cover_letter 
                                : `${application.cover_letter.substring(0, 200)}...`}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCoverLetter(application.id);
                                }}
                              >
                                {expandedCoverLetters[application.id] ? "Show Less" : "Read More"}
                              </Button>
                            </>
                          ) 
                          : application.cover_letter}
                      </div>
                    </div>
                  )}
                  
                  {application.job_post.required_skills && application.job_post.required_skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {application.job_post.required_skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-4 border-t flex flex-col md:flex-row md:justify-between gap-4 bg-gray-50">
                  <div className="flex items-center">
                    {application.resume_url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center mr-4 bg-white"
                        onClick={() => window.open(application.resume_url as string, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2 text-blue-600" />
                        Resume
                      </Button>
                    )}
                    <span className="text-xs text-gray-500">
                      ID: {application.id.substring(0, 8)}...
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {application.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'reviewing')}
                          disabled={!!processingId}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 bg-white"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Start Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          disabled={!!processingId}
                          className="border-red-200 text-red-700 hover:bg-red-50 bg-white"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {application.status === 'reviewing' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'accepted')}
                          disabled={!!processingId}
                          className="border-green-200 text-green-700 hover:bg-green-50 bg-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          disabled={!!processingId}
                          className="border-red-200 text-red-700 hover:bg-red-50 bg-white"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {(application.status === 'accepted' || application.status === 'rejected') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateApplicationStatus(application.id, 'reviewing')}
                        disabled={!!processingId}
                        className="bg-white"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Re-review
                      </Button>
                    )}
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => viewApplicationDetails(application)}
                      className="ml-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedApplication && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="sticky top-0 bg-white z-10">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold">Application Details</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedApplication.job_seeker.full_name}'s application for {selectedApplication.job_post.title}
                    </DialogDescription>
                  </div>
                  <Badge 
                    className={`px-3 py-1.5 text-white 
                      ${selectedApplication.status === 'pending' ? 'bg-yellow-500' : 
                      selectedApplication.status === 'reviewing' ? 'bg-blue-500' : 
                      selectedApplication.status === 'accepted' ? 'bg-green-500' : 
                      'bg-red-500'}
                      flex items-center gap-1.5 shadow-sm`}
                  >
                    {selectedApplication.status === 'pending' && <AlertCircle className="h-3.5 w-3.5" />}
                    {selectedApplication.status === 'reviewing' && <Clock className="h-3.5 w-3.5" />}
                    {selectedApplication.status === 'accepted' && <CheckCircle className="h-3.5 w-3.5" />}
                    {selectedApplication.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                    {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                  </Badge>
                </div>
              </DialogHeader>
            </div>
            
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Applicant Information */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <User className="mr-2 h-5 w-5 text-blue-600" />
                        Applicant Information
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Full Name</p>
                        <p className="text-base font-medium">{selectedApplication.job_seeker.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-base">{selectedApplication.email}</p>
                      </div>
                      {selectedApplication.contact_number && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Contact Number</p>
                          <p className="text-base">{selectedApplication.contact_number}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500">Applied On</p>
                        <p className="text-base">{format(new Date(selectedApplication.created_at), 'PPP')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Job Information */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Briefcase className="mr-2 h-5 w-5 text-blue-600" />
                        Job Information
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Position</p>
                        <p className="text-base font-medium">{selectedApplication.job_post.title}</p>
                      </div>
                      
                      {selectedApplication.job_post.required_skills && selectedApplication.job_post.required_skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Required Skills</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedApplication.job_post.required_skills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resume Section */}
                  {selectedApplication.resume_url && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <FileText className="mr-2 h-5 w-5 text-blue-600" />
                          Resume
                        </h3>
                      </div>
                      <div className="p-4">
                        <Button 
                          className="w-full flex items-center justify-center"
                          onClick={() => window.open(selectedApplication.resume_url as string, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  {/* Cover Letter */}
                  {selectedApplication.cover_letter && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <FileText className="mr-2 h-5 w-5 text-blue-600" />
                          Cover Letter
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className={`bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm whitespace-pre-wrap ${
                          expandedCoverLetters[selectedApplication.id] ? "max-h-none" : "max-h-[300px] overflow-y-auto"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                          
                          {selectedApplication.cover_letter.length > 500 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-4 text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
                              onClick={() => toggleCoverLetter(selectedApplication.id)}
                            >
                              {expandedCoverLetters[selectedApplication.id] ? "Show Less" : "Read More"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Application Status */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Clock className="mr-2 h-5 w-5 text-blue-600" />
                        Update Status
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Current status: <span className="font-semibold capitalize">{selectedApplication.status}</span></p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              selectedApplication.status === 'pending' ? 'w-1/4 bg-yellow-500' : 
                              selectedApplication.status === 'reviewing' ? 'w-2/4 bg-blue-500' : 
                              selectedApplication.status === 'accepted' ? 'w-full bg-green-500' : 
                              'w-3/4 bg-red-500'
                            }`}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApplication.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => {
                                updateApplicationStatus(selectedApplication.id, 'reviewing');
                                setSelectedApplication(prev => prev ? {...prev, status: 'reviewing'} : null);
                              }}
                              className="flex items-center justify-center bg-blue-600 hover:bg-blue-700"
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Start Review
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                updateApplicationStatus(selectedApplication.id, 'rejected');
                                setSelectedApplication(prev => prev ? {...prev, status: 'rejected'} : null);
                              }}
                              className="flex items-center justify-center border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {selectedApplication.status === 'reviewing' && (
                          <>
                            <Button
                              onClick={() => {
                                updateApplicationStatus(selectedApplication.id, 'accepted');
                                setSelectedApplication(prev => prev ? {...prev, status: 'accepted'} : null);
                              }}
                              className="flex items-center justify-center bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                updateApplicationStatus(selectedApplication.id, 'rejected');
                                setSelectedApplication(prev => prev ? {...prev, status: 'rejected'} : null);
                              }}
                              className="flex items-center justify-center border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {(selectedApplication.status === 'accepted' || selectedApplication.status === 'rejected') && (
                          <Button
                            onClick={() => {
                              updateApplicationStatus(selectedApplication.id, 'reviewing');
                              setSelectedApplication(prev => prev ? {...prev, status: 'reviewing'} : null);
                            }}
                            className="flex items-center justify-center"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Re-review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-4 bg-gray-50 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailsOpen(false)}
                className="px-6"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 