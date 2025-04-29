import * as React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Bell, BellRing, User, Briefcase, Calendar, CheckCircle, XCircle, Clock, FileText, Mail, Phone } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: {
    job_post_id?: string;
    application_id?: string;
    applicant_id?: string;
    applicant_name?: string;
    applicant_email?: string;
    status?: string;
  };
}

interface ApplicationDetail {
  id: string;
  job_title: string;
  applicant_name: string;
  applicant_email: string;
  contact_number: string;
  status: string;
  created_at: string;
  resume_url?: string;
  applicant_avatar?: string;
}

interface AuthUser {
  id: string;
  role?: string;
}

interface JobPost {
  id: string;
  title: string;
  employer_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const authUser = user as AuthUser;
  const role = authUser?.role;
  const isEmployer = role === 'employer';
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applicationDetails, setApplicationDetails] = useState<Record<string, ApplicationDetail>>({});

  useEffect(() => {
    if (!authUser) return;

    // Fetch notifications based on user role
    const fetchNotifications = async () => {
      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (isEmployer) {
          // For employers, also get notifications for their job posts
          const { data: employerJobs } = await supabase
            .from('job_posts')
            .select('id')
            .eq('employer_id', authUser.id);

          if (employerJobs && employerJobs.length > 0) {
            const jobIds = employerJobs.map(job => job.id);
            query = query.or(`metadata->job_post_id.in.(${jobIds})`);
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);

        // Fetch application details for new application notifications
        const applicationIds = data
          ?.filter(n => n.type === 'new_application' && n.metadata?.application_id)
          .map(n => n.metadata.application_id);

        if (applicationIds?.length && isEmployer) {
          const { data: applications, error: appError } = await supabase
            .from('job_applications')
            .select(`
              id,
              email,
              contact_number,
              status,
              created_at,
              resume_url,
              job_post:job_posts!inner (
                id,
                title,
                employer_id
              ),
              profile:profiles!inner (
                id,
                full_name,
                avatar_url
              )
            `)
            .in('id', applicationIds)
            .eq('job_post.employer_id', authUser.id);

          if (!appError && applications) {
            const detailsMap = applications.reduce((acc, app) => ({
              ...acc,
              [app.id]: {
                id: app.id,
                job_title: app.job_post && Array.isArray(app.job_post) && app.job_post[0] ? app.job_post[0].title : 'Unknown Job',
                applicant_name: app.profile && Array.isArray(app.profile) && app.profile[0] ? app.profile[0].full_name : 'Unknown Applicant',
                applicant_email: app.email || 'No email provided',
                contact_number: app.contact_number || 'No contact number',
                status: app.status,
                created_at: app.created_at,
                resume_url: app.resume_url || undefined,
                applicant_avatar: app.profile && Array.isArray(app.profile) && app.profile[0] ? app.profile[0].avatar_url : undefined
              }
            }), {});

            setApplicationDetails(detailsMap);
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
      }
    };

    // Set up real-time subscription for notifications
    const notificationSubscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUser.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            
            // Fetch application details if it's a new application notification
            if (newNotification.type === 'new_application' && newNotification.metadata?.application_id && isEmployer) {
              const { data, error } = await supabase
                .from('job_applications')
                .select(`
                  id,
                  email,
                  contact_number,
                  status,
                  created_at,
                  resume_url,
                  job_post:job_posts!inner (
                    id,
                    title,
                    employer_id
                  ),
                  profile:profiles!inner (
                    id,
                    full_name,
                    avatar_url
                  )
                `)
                .eq('id', newNotification.metadata.application_id)
                .eq('job_post.employer_id', authUser.id)
                .single();

              if (data && !error) {
                setApplicationDetails(prev => ({
                  ...prev,
                  [data.id]: {
                    id: data.id,
                    job_title: data.job_post && Array.isArray(data.job_post) && data.job_post[0] ? data.job_post[0].title : 'Unknown Job',
                    applicant_name: data.profile && Array.isArray(data.profile) && data.profile[0] ? data.profile[0].full_name : 'Unknown Applicant',
                    applicant_email: data.email || 'No email provided',
                    contact_number: data.contact_number || 'No contact number',
                    status: data.status,
                    created_at: data.created_at,
                    resume_url: data.resume_url || undefined,
                    applicant_avatar: data.profile && Array.isArray(data.profile) && data.profile[0] ? data.profile[0].avatar_url : undefined
                  }
                }));
              }
            }

            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            toast(newNotification.message, {
              description: `New ${newNotification.type} notification`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for job applications for employers
    let applicationSubscription;
    if (isEmployer) {
      applicationSubscription = supabase
        .channel('job_applications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'job_applications'
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newApplication = payload.new;
              
              // Check if this application is for one of the employer's job posts
              const { data: jobPostData, error } = await supabase
                .from('job_posts')
                .select('id, title, employer_id')
                .eq('id', newApplication.job_post_id)
                .single();
              
              const jobPost = jobPostData as JobPost;
              
              // Fix: Check if the job post belongs to the current employer
              if (jobPost && !error && jobPost.employer_id === authUser.id) {
                // Get applicant details
                const { data: applicantData } = await supabase
                  .from('profiles')
                  .select('id, full_name')
                  .eq('id', newApplication.job_seeker_id)
                  .single();
                
                const applicant = applicantData as Profile;
                const applicantName = applicant?.full_name || 'Unknown';
                
                // Create a notification for the employer
                const notificationMessage = `New application from ${applicantName} for "${jobPost.title}"`;
                
                // Check if notification already exists (to prevent duplicates)
                const { data: existingNotification } = await supabase
                  .from('notifications')
                  .select('id')
                  .eq('user_id', authUser.id)
                  .eq('type', 'new_application')
                  .eq('metadata->application_id', newApplication.id)
                  .single();
                
                if (!existingNotification) {
                  // Insert notification directly into the notifications table
                  await supabase
                    .from('notifications')
                    .insert({
                      user_id: authUser.id,
                      type: 'new_application',
                      message: notificationMessage,
                      read: false,
                      metadata: {
                        application_id: newApplication.id,
                        job_post_id: newApplication.job_post_id,
                        applicant_id: newApplication.job_seeker_id,
                        applicant_name: applicantName
                      }
                    });
                  
                  // This will trigger the notification subscription above
                }
              }
            }
          }
        )
        .subscribe();
    }

    fetchNotifications();

    return () => {
      supabase.removeChannel(notificationSubscription);
      if (applicationSubscription) {
        supabase.removeChannel(applicationSubscription);
      }
    };
  }, [authUser, isEmployer]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (isEmployer) {
      // Handle employer notifications
      if (notification.type === 'new_application' && notification.metadata?.application_id) {
        navigate(`/employer/applications`);
      } else if (notification.type === 'new_application' && notification.metadata?.job_post_id) {
        navigate(`/employer/applications?jobId=${notification.metadata.job_post_id}`);
      }
    } else {
      // Handle job seeker notifications
      if (notification.type === 'application_status' && notification.metadata?.application_id) {
        navigate(`/applications`);
      }
    }
  };

  const getNotificationIcon = (type: string, status?: string) => {
    switch (type) {
      case 'new_application':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'application_status':
        if (status === 'accepted') return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-500" />;
        if (status === 'reviewing') return <Clock className="h-4 w-4 text-blue-500" />;
        return <Briefcase className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5 text-blue-600" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-green-500">
                {unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-lg rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-700">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => {
                const appDetails = notification.metadata?.application_id 
                  ? applicationDetails[notification.metadata.application_id] 
                  : undefined;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type, notification.metadata?.status || appDetails?.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-800">{notification.message}</p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        
                        {notification.type === 'new_application' && appDetails && (
                          <div className="mt-1 bg-white p-2 rounded border border-gray-100 text-xs">
                            <div className="flex items-center text-gray-600 mb-1">
                              <Briefcase className="h-3 w-3 mr-1" />
                              <span className="font-medium">{appDetails.job_title}</span>
                            </div>
                            <div className="flex items-center text-gray-600 mb-1">
                              <User className="h-3 w-3 mr-1" />
                              <span>{appDetails.applicant_name}</span>
                            </div>
                            <div className="flex items-center text-gray-600 mb-1">
                              <Mail className="h-3 w-3 mr-1" />
                              <span>{appDetails.applicant_email}</span>
                            </div>
                            {appDetails.contact_number && (
                              <div className="flex items-center text-gray-600 mb-1">
                                <Phone className="h-3 w-3 mr-1" />
                                <span>{appDetails.contact_number}</span>
                              </div>
                            )}
                            {appDetails.resume_url && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-1 h-6 text-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(appDetails.resume_url, '_blank');
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                View Resume
                              </Button>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
