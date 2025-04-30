import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Users, Briefcase, FileText, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Clock, BarChart3, PieChart
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../components/ui/use-toast';

// Define dashboard data interface
interface DashboardStats {
  jobPosts: {
    count: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  employers: {
    count: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  applications: {
    count: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  conversionRate: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

interface RecentActivity {
  id: string;
  action: string;
  details: string;
  time: string;
  type: 'job' | 'employer' | 'application';
}

export function AdminDashboard() {
  const { isDarkMode } = useTheme();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7'); // Default to 7 days
  const [stats, setStats] = useState<DashboardStats>({
    jobPosts: { count: 0, change: 0, trend: 'neutral' },
    employers: { count: 0, change: 0, trend: 'neutral' },
    applications: { count: 0, change: 0, trend: 'neutral' },
    conversionRate: { value: 0, change: 0, trend: 'neutral' }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin, timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current date and date from X days ago
      const now = new Date();
      const daysAgo = new Date();
      daysAgo.setDate(now.getDate() - parseInt(timeRange));
      
      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(daysAgo.getDate() - parseInt(timeRange));
      
      // Format dates for Supabase queries
      const nowStr = now.toISOString();
      const daysAgoStr = daysAgo.toISOString();
      const previousPeriodStartStr = previousPeriodStart.toISOString();
      
      // Fetch current period job posts count
      const { count: currentJobPostsCount } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', daysAgoStr)
        .lte('created_at', nowStr);
      
      // Fetch previous period job posts count
      const { count: previousJobPostsCount } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousPeriodStartStr)
        .lt('created_at', daysAgoStr);
      
      // Fetch current period employers count
      const { count: currentEmployersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employer')
        .gte('created_at', daysAgoStr)
        .lte('created_at', nowStr);
      
      // Fetch previous period employers count
      const { count: previousEmployersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employer')
        .gte('created_at', previousPeriodStartStr)
        .lt('created_at', daysAgoStr);
      
      // Fetch current period applications count
      const { count: currentApplicationsCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', daysAgoStr)
        .lte('created_at', nowStr);
      
      // Fetch previous period applications count
      const { count: previousApplicationsCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousPeriodStartStr)
        .lt('created_at', daysAgoStr);
      
      // Fetch accepted applications for current period
      const { count: currentAcceptedCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .gte('created_at', daysAgoStr)
        .lte('created_at', nowStr);
      
      // Fetch accepted applications for previous period
      const { count: previousAcceptedCount } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .gte('created_at', previousPeriodStartStr)
        .lt('created_at', daysAgoStr);
      
      // Calculate conversion rates
      const currentConversionRate = currentApplicationsCount ? 
        (currentAcceptedCount / currentApplicationsCount) * 100 : 0;
      
      const previousConversionRate = previousApplicationsCount ? 
        (previousAcceptedCount / previousApplicationsCount) * 100 : 0;
      
      // Calculate percentage changes
      const jobPostsChange = calculatePercentageChange(previousJobPostsCount || 0, currentJobPostsCount || 0);
      const employersChange = calculatePercentageChange(previousEmployersCount || 0, currentEmployersCount || 0);
      const applicationsChange = calculatePercentageChange(previousApplicationsCount || 0, currentApplicationsCount || 0);
      const conversionRateChange = calculatePercentageChange(previousConversionRate, currentConversionRate);
      
      // Fetch recent activity
      const { data: recentJobPosts } = await supabase
        .from('job_posts')
        .select('id, title, company_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      const { data: recentEmployers } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, created_at')
        .eq('role', 'employer')
        .order('created_at', { ascending: false })
        .limit(3);
      
      const { data: recentApplications } = await supabase
        .from('job_applications')
        .select(`
          id, 
          created_at,
          job_posts(title),
          job_seeker_profile:job_seeker_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Format recent activity
      const formattedActivity: RecentActivity[] = [
        ...(recentJobPosts || []).map(job => ({
          id: job.id,
          action: 'New job post created',
          details: `${job.title} at ${job.company_name || 'Unknown Company'}`,
          time: formatTimeAgo(new Date(job.created_at)),
          type: 'job' as const
        })),
        ...(recentEmployers || []).map(employer => ({
          id: employer.id,
          action: 'New employer registered',
          details: employer.company_name || employer.full_name || 'Unknown Employer',
          time: formatTimeAgo(new Date(employer.created_at)),
          type: 'employer' as const
        })),
        ...(recentApplications || []).map(app => ({
          id: app.id,
          action: 'Application submitted',
          details: `${app.job_seeker_profile?.full_name || 'Unknown'} for ${app.job_posts?.title || 'Unknown Position'}`,
          time: formatTimeAgo(new Date(app.created_at)),
          type: 'application' as const
        }))
      ].sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      }).slice(0, 5);
      
      // Update state with fetched data
      setStats({
        jobPosts: {
          count: currentJobPostsCount || 0,
          change: jobPostsChange,
          trend: jobPostsChange > 0 ? 'up' : jobPostsChange < 0 ? 'down' : 'neutral'
        },
        employers: {
          count: currentEmployersCount || 0,
          change: employersChange,
          trend: employersChange > 0 ? 'up' : employersChange < 0 ? 'down' : 'neutral'
        },
        applications: {
          count: currentApplicationsCount || 0,
          change: applicationsChange,
          trend: applicationsChange > 0 ? 'up' : applicationsChange < 0 ? 'down' : 'neutral'
        },
        conversionRate: {
          value: parseFloat(currentConversionRate.toFixed(1)),
          change: conversionRateChange,
          trend: conversionRateChange > 0 ? 'up' : conversionRateChange < 0 ? 'down' : 'neutral'
        }
      });
      
      setRecentActivity(formattedActivity);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate percentage change
  const calculatePercentageChange = (previous: number, current: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  };

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage your platform's performance
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select 
            className="block w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeletons
          [...Array(4)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </Card>
          ))
        ) : (
          // Actual stats
          <>
            <StatCard 
              title="Job Posts"
              value={stats.jobPosts.count.toString()}
              change={`${stats.jobPosts.change > 0 ? '+' : ''}${stats.jobPosts.change}%`}
              trend={stats.jobPosts.trend}
              description="Active job posts"
              icon={FileText}
              color="blue"
              isDarkMode={isDarkMode}
            />
            
            <StatCard 
              title="Employers"
              value={stats.employers.count.toString()}
              change={`${stats.employers.change > 0 ? '+' : ''}${stats.employers.change}%`}
              trend={stats.employers.trend}
              description="Registered employers"
              icon={Briefcase}
              color="green"
              isDarkMode={isDarkMode}
            />
            
            <StatCard 
              title="Applications"
              value={stats.applications.count.toString()}
              change={`${stats.applications.change > 0 ? '+' : ''}${stats.applications.change}%`}
              trend={stats.applications.trend}
              description="Total applications"
              icon={Users}
              color="purple"
              isDarkMode={isDarkMode}
            />
            
            <StatCard 
              title="Conversion Rate"
              value={`${stats.conversionRate.value}%`}
              change={`${stats.conversionRate.change > 0 ? '+' : ''}${stats.conversionRate.change}%`}
              trend={stats.conversionRate.trend}
              description="Application success rate"
              icon={TrendingUp}
              color="orange"
              isDarkMode={isDarkMode}
            />
          </>
        )}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'job' 
                      ? 'bg-blue-100 dark:bg-blue-900/20' 
                      : activity.type === 'employer' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-purple-100 dark:bg-purple-900/20'
                  }`}>
                    {activity.type === 'job' ? (
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : activity.type === 'employer' ? (
                      <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.details}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Analytics Overview</h3>
          </div>
          
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Application Status</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Accepted</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Rejected</span>
                  </div>
                </div>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {loading ? (
                <div className="animate-pulse h-32 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <PieChart className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Analytics visualization will appear here</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Response Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">2.4 days</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg. Time to Hire</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">14 days</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">78%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  description: string;
  icon: React.ElementType;
  color: string;
  isDarkMode: boolean;
}

function StatCard({ title, value, change, trend, description, icon: Icon, color, isDarkMode }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div className={`flex items-center text-sm ${
            trend === 'up' 
              ? 'text-green-600 dark:text-green-400' 
              : trend === 'down' 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-600 dark:text-gray-400'
          }`}>
            <span>{change}</span>
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 ml-1" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-4 w-4 ml-1" />
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}


