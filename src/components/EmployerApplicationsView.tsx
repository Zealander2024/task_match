import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Root as Tabs, List as TabsList, Trigger as TabsTrigger, Content as TabsContent } from '@radix-ui/react-tabs';
import { formatDistanceToNow } from 'date-fns';
import { Download, Eye, Mail, Phone } from 'lucide-react';
import { EmployerPayment } from './EmployerPayment';
import * as Dialog from '@radix-ui/react-dialog';

interface Application {
  id: string;
  job_post_id: string;
  job_seeker_id: string;
  status: string;
  created_at: string;
  resume_url: string;
  cover_letter: string;
  email: string;
  contact_number: string;
  job_posts: {
    title: string;
  };
  job_seekers: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
    };
  };
}

export function EmployerApplicationsView({ jobId }: { jobId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const itemsPerPage = 10;
  const [showPayment, setShowPayment] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      // Fetch job posts by employer
      const { data: jobPosts, error: jobPostsError } = await supabase
        .from('job_posts')
        .select('id')
        .eq('employer_id', user?.id);
        
      if (jobPostsError) throw jobPostsError;
      
      if (!jobPosts || jobPosts.length === 0) {
        setApplications([]);
        return;
      }
      
      const jobPostIds = jobPosts.map(post => post.id);
      
      // Get total count
      let countQuery = supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true });
      
      if (jobId) {
        countQuery = countQuery.eq('job_post_id', jobId);
      } else {
        countQuery = countQuery.in('job_post_id', jobPostIds);
      }

      if (activeTab !== 'all') {
        countQuery = countQuery.eq('status', activeTab);
      }

      const { count } = await countQuery;
      setTotalApplications(count || 0);
      
      // Fetch paginated applications
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          job_posts:job_post_id (title),
          job_seekers:job_seeker_id (id, email, user_metadata)
        `);
      
      if (jobId) {
        query = query.eq('job_post_id', jobId);
      } else {
        query = query.in('job_post_id', jobPostIds);
      }

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      const { data, error: applicationsError } = await query
        .order('created_at', { ascending: false })
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );
      
      if (applicationsError) throw applicationsError;
      setApplications(data || []);
      
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [jobId, user, activeTab, currentPage]);

  // Add this function to create a notification when application status changes
  const notifyApplicant = async (applicationId: string, status: string, applicantId: string) => {
    try {
      const { data: application } = await supabase
        .from('job_applications')
        .select(`
          *,
          job_posts:job_post_id (title)
        `)
        .eq('id', applicationId)
        .single();
        
      if (!application) return;
      
      // Create notification for the applicant
      await supabase
        .from('notifications')
        .insert({
          user_id: applicantId,
          type: 'application_status',
          message: `Your application for "${application.job_posts.title}" has been ${status}`,
          metadata: {
            job_post_id: application.job_post_id,
            application_id: applicationId,
            status: status
          },
          read: false
        });
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };
  
  // Update the status change function
  const updateApplicationStatus = async (applicationId: string, newStatus: string, applicantId: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);
        
      if (error) throw error;
      
      // Update local state
      setApplications(prev => 
        prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app)
      );
      
      // Notify the applicant about status change
      await notifyApplicant(applicationId, newStatus, applicantId);
      
    } catch (err) {
      console.error('Error updating application status:', err);
    }
  };

  const handlePaymentSuccess = async () => {
    // Update application status
    await updateApplicationStatus(selectedApplication.id, 'paid', selectedApplication.job_seeker_id);
    setShowPayment(false);
    // Refresh applications list
    fetchApplications();
  };

  const filteredApplications = activeTab === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeTab);

  if (loading) return <div className="flex justify-center p-8">Loading applications...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (applications.length === 0) return <div className="text-center p-8">No applications found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {jobId ? 'Applications for this job' : 'All Applications'}
        </h2>
        <Badge variant="outline">{applications.length} Total</Badge>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            <Badge variant="secondary" className="ml-2">
              {applications.filter(app => app.status === 'pending').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewing">
            Reviewing
            <Badge variant="secondary" className="ml-2">
              {applications.filter(app => app.status === 'reviewing').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
            <Badge variant="secondary" className="ml-2">
              {applications.filter(app => app.status === 'rejected').length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4">
          {filteredApplications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {app.job_seekers?.user_metadata?.full_name || 'Applicant'}
                    </CardTitle>
                    <CardDescription>
                      Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })} 
                      for {app.job_posts?.title}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={
                      app.status === 'pending' ? 'bg-yellow-500' : 
                      app.status === 'reviewing' ? 'bg-blue-500' : 
                      app.status === 'rejected' ? 'bg-red-500' : 
                      'bg-green-500'
                    }
                  >
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>{app.email || app.job_seekers?.email}</span>
                      </div>
                      {app.contact_number && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{app.contact_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Application Details</h4>
                    <div className="space-y-2">
                      {app.resume_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(app.resume_url, '_blank')}
                          className="flex items-center"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employer/applications/${app.id}`)}
                        className="flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Application
                      </Button>
                    </div>
                  </div>
                </div>
                
                {app.cover_letter && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Cover Letter</h4>
                    <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                      {app.cover_letter.length > 200 
                        ? `${app.cover_letter.substring(0, 200)}...` 
                        : app.cover_letter}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* CardFooter with application status buttons */}
              <CardFooter className="flex justify-end space-x-2">
                {app.status !== 'rejected' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => updateApplicationStatus(app.id, 'rejected', app.job_seeker_id)}
                  >
                    Reject
                  </Button>
                )}
                
                {app.status === 'pending' && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => updateApplicationStatus(app.id, 'reviewing', app.job_seeker_id)}
                  >
                    Start Review
                  </Button>
                )}
                
                {app.status === 'reviewing' && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => updateApplicationStatus(app.id, 'accepted', app.job_seeker_id)}
                  >
                    Accept
                  </Button>
                )}
                {app.status === 'accepted' && (
                  <button
                    onClick={() => {
                      setSelectedApplication(app);
                      setShowPayment(true);
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded-md"
                  >
                    Process Payment
                  </button>
                )}
              </CardFooter>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalApplications / itemsPerPage)}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalApplications}
      />
      {showPayment && selectedApplication && (
        <Dialog.Root open={showPayment} onOpenChange={setShowPayment}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-lg">
              <EmployerPayment
                jobApplicationId={selectedApplication.id}
                jobseekerId={selectedApplication.job_seeker_id}
                amount={selectedApplication.job_posts.budget}
                onSuccess={handlePaymentSuccess}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
