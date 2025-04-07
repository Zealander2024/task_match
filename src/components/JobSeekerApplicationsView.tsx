import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Building, Calendar, FileText, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';

interface Application {
  id: string;
  job_post_id: string;
  status: string;
  created_at: string;
  resume_url: string;
  cover_letter: string;
  email: string;
  contact_number: string;
  job_posts: {
    title: string;
    company_name?: string;
    location?: string;
  };
}

export function JobSeekerApplicationsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        
        if (!user) {
          setError('You must be logged in to view your applications');
          return;
        }
        
        // Fetch all applications by this job seeker
        const { data, error: applicationsError } = await supabase
          .from('job_applications')
          .select(`
            id,
            job_post_id,
            status,
            created_at,
            resume_url,
            cover_letter,
            email,
            contact_number,
            job_posts:job_post_id (
              title,
              company_name,
              location
            )
          `)
          .eq('job_seeker_id', user.id)
          .order('created_at', { ascending: false });
        
        if (applicationsError) throw applicationsError;
        
        setApplications(data || []);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError('Failed to load your applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
    
    // Set up real-time subscription for application status updates
    const subscription = supabase
      .channel('job_applications_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'job_applications',
        filter: `job_seeker_id=eq.${user?.id}`
      }, (payload) => {
        setApplications(prev => 
          prev.map(app => app.id === payload.new.id ? { ...app, ...payload.new } : app)
        );
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, navigate]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'reviewing':
        return 'bg-blue-500';
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading your applications...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center my-8">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <p className="text-red-600 font-medium">{error}</p>
      <Button 
        variant="outline" 
        className="mt-4 border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => window.location.reload()}
      >
        Try Again
      </Button>
    </div>
  );
  
  if (applications.length === 0) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center my-8">
      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-700 mb-2">No Applications Yet</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">
        You haven't submitted any job applications yet. Start exploring jobs and apply to begin your career journey.
      </p>
      <Button 
        onClick={() => navigate('/dashboard')}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      >
        Explore Jobs
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            My Applications
          </h2>
          <p className="text-gray-600 mt-1">Track the status of your job applications</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1 text-sm font-medium">
            {applications.length} {applications.length === 1 ? 'Application' : 'Applications'}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 px-3 py-1 text-sm font-medium">
            {applications.filter(app => app.status === 'pending').length} Pending
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {applications.map((app) => (
          <Card key={app.id} className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow duration-300">
            <div className={`h-2 ${
              app.status === 'pending' ? 'bg-yellow-500' : 
              app.status === 'reviewing' ? 'bg-blue-500' : 
              app.status === 'accepted' ? 'bg-green-500' : 
              'bg-red-500'
            }`}></div>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-xl text-gray-800 hover:text-blue-600 transition-colors">
                    {app.job_posts?.title || 'Job Title'}
                  </CardTitle>
                  <CardDescription className="mt-2 space-y-1">
                    {app.job_posts?.company_name && (
                      <div className="flex items-center text-gray-600">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        {app.job_posts.company_name}
                      </div>
                    )}
                    {app.job_posts?.location && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        {app.job_posts.location}
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                    </div>
                  </CardDescription>
                </div>
                <Badge className={`px-3 py-1.5 text-white ${getStatusBadgeColor(app.status)} flex items-center gap-1.5`}>
                  {app.status === 'pending' && <AlertCircle className="h-3.5 w-3.5" />}
                  {app.status === 'reviewing' && <Clock className="h-3.5 w-3.5" />}
                  {app.status === 'accepted' && <CheckCircle className="h-3.5 w-3.5" />}
                  {app.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-2">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <AlertCircle className={`h-4 w-4 mr-2 ${
                    app.status === 'pending' ? 'text-yellow-500' : 
                    app.status === 'reviewing' ? 'text-blue-500' : 
                    app.status === 'accepted' ? 'text-green-500' : 
                    'text-red-500'
                  }`} />
                  Application Status
                </h4>
                <p className="text-sm text-gray-600">
                  {app.status === 'pending' && 'Your application is pending review by the employer.'}
                  {app.status === 'reviewing' && 'Good news! The employer is currently reviewing your application.'}
                  {app.status === 'accepted' && 'Congratulations! Your application has been accepted. The employer may contact you soon.'}
                  {app.status === 'rejected' && 'Unfortunately, your application was not selected for this position. Don\'t give up!'}
                </p>
              </div>
              
              {app.cover_letter && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Your Cover Letter
                  </h4>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {app.cover_letter.length > 200 
                      ? <div dangerouslySetInnerHTML={{ __html: app.cover_letter.substring(0, 200) + '...' }} />
                      : <div dangerouslySetInnerHTML={{ __html: app.cover_letter }} />
                    }
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50 border-t border-gray-100 px-6 py-4">
              <div className="text-sm text-gray-500 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Applied on {new Date(app.created_at).toLocaleDateString()}
              </div>
              
              <div className="flex items-center gap-3">
                {app.resume_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(app.resume_url, '_blank')}
                    className="flex items-center border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate(`/jobs/${app.job_post_id}`)}
                  className="flex items-center bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Job
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}