import React, { useEffect, useState } from 'react';
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

interface ApplicationDetails {
  id: string;
  job_title: string;
  applicant_name: string;
  applicant_email: string;
  contact_number: string;
  status: string;
  created_at: string;
  resume_url?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applicationDetails, setApplicationDetails] = useState<Record<string, ApplicationDetails>>({});
  const [isEmployer, setIsEmployer] = useState(false);
  const [employerJobPosts, setEmployerJobPosts] = useState<string[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Update notifications state
      setNotifications(notificationsData || []);
      setUnreadCount(notificationsData?.filter(n => !n.read).length || 0);

      // Fetch application details for application-related notifications
      const applicationIds = notificationsData
        ?.filter(n => 
          n.type === 'new_application' && 
          n.metadata && 
          'application_id' in n.metadata
        )
        .map(n => n.metadata.application_id);

      if (applicationIds?.length) {
        const { data: applications, error: applicationsError } = await supabase
          .from('job_applications')
          .select(`
            id,
            job_post_id,
            email,
            contact_number,
            status,
            created_at,
            resume_url,
            job_posts:job_post_id (
              title
            ),
            profiles:job_seeker_id (
              full_name,
              avatar_url
            )
          `)
          .in('id', applicationIds);

        if (applicationsError) throw applicationsError;

        // Update application details state
        const details: Record<string, ApplicationDetails> = {};
        applications?.forEach(app => {
          details[app.id] = {
            id: app.id,
            job_title: app.job_posts?.title || 'Unknown Job',
            applicant_name: app.profiles?.full_name || 'Unknown Applicant',
            applicant_email: app.email || 'No email provided',
            contact_number: app.contact_number || 'No contact number',
            status: app.status,
            created_at: app.created_at,
            resume_url: app.resume_url,
            applicant_avatar: app.profiles?.avatar_url
          };
        });
        setApplicationDetails(details);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const notificationSubscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Fetch application details if needed
          if (
            newNotification.type === 'new_application' && 
            newNotification.metadata?.application_id
          ) {
            const { data, error } = await supabase
              .from('job_applications')
              .select(`
                id,
                job_post_id,
                email,
                contact_number,
                status,
                created_at,
                resume_url,
                job_posts:job_post_id (title),
                profiles:job_seeker_id (full_name, avatar_url)
              `)
              .eq('id', newNotification.metadata.application_id)
              .single();

            if (!error && data) {
              setApplicationDetails(prev => ({
                ...prev,
                [data.id]: {
                  id: data.id,
                  job_title: data.job_posts?.title || 'Unknown Job',
                  applicant_name: data.profiles?.full_name || 'Unknown Applicant',
                  applicant_email: data.email || 'No email provided',
                  contact_number: data.contact_number || 'No contact number',
                  status: data.status,
                  created_at: data.created_at,
                  resume_url: data.resume_url,
                  applicant_avatar: data.profiles?.avatar_url
                }
              }));
            }
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchNotifications();

    return () => {
      supabase.removeChannel(notificationSubscription);
    };
  }, [user]);

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
        navigate(`/employer/applications/${notification.metadata.application_id}`);
      } else if (notification.type === 'new_application' && notification.metadata?.job_post_id) {
        navigate(`/employer/jobs/${notification.metadata.job_post_id}/applications`);
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
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500">
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
