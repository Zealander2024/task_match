import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AlertTriangle, CheckCircle, XCircle, Eye, User, Briefcase, MessageSquare } from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';

interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: 'user' | 'job' | 'message';
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  reporter: {
    full_name: string;
    email: string;
  } | null;
  target_user?: {
    full_name: string;
    email: string;
  } | null;
  target_job?: {
    title: string;
    company_name: string;
  } | null;
}

export function ReportsManagement() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin, filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // First, get the reports
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data: reportsData, error } = await query;
      
      if (error) throw error;
      
      // Then fetch the related user data separately
      const reportsWithDetails = await Promise.all((reportsData || []).map(async (report) => {
        // Get reporter details
        const { data: reporterData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', report.reporter_id)
          .single();
        
        // Get target user details if target is a user
        let targetUserData = null;
        if (report.target_type === 'user') {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', report.target_id)
            .single();
          targetUserData = data;
        }
        
        // Get job details if target is a job
        let targetJobData = null;
        if (report.target_type === 'job') {
          const { data } = await supabase
            .from('job_posts')
            .select('title, company_name')
            .eq('id', report.target_id)
            .single();
          targetJobData = data;
        }
        
        return { 
          ...report, 
          reporter: reporterData,
          target_user: targetUserData,
          target_job: targetJobData
        };
      }));
      
      setReports(reportsWithDetails as Report[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setDetailsOpen(true);
  };

  const handleUpdateStatus = async (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);
      
      if (error) throw error;
      
      toast({
        title: "Report Updated",
        description: `Report has been marked as ${status}`,
      });
      
      setDetailsOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Dismissed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'job':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports Management</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review and manage user reports
        </p>
      </div>

      <Tabs defaultValue="all" value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <Card>
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filter === 'all' 
                    ? 'There are no reports in the system.' 
                    : `There are no ${filter} reports at this time.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTypeIcon(report.target_type)}
                            <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                              {report.target_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {report.reporter?.full_name || 'Unknown User'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {report.target_type === 'user' 
                            ? report.target_user?.full_name || 'Unknown User'
                            : report.target_type === 'job'
                              ? report.target_job?.title || 'Unknown Job'
                              : 'Message Content'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {report.reason}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewDetails(report)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Report Details
            </DialogTitle>
            <DialogDescription>
              Review the details of this report and take appropriate action.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Type</h4>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedReport.target_type}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reported By</h4>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedReport.reporter?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedReport.reporter?.email || 'No email available'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Target</h4>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedReport.target_type === 'user' 
                      ? selectedReport.target_user?.full_name || 'Unknown User'
                      : selectedReport.target_type === 'job'
                        ? selectedReport.target_job?.title || 'Unknown Job'
                        : 'Message Content'}
                  </p>
                  {selectedReport.target_type === 'user' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedReport.target_user?.email || 'No email available'}
                    </p>
                  )}
                  {selectedReport.target_type === 'job' && selectedReport.target_job?.company_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedReport.target_job.company_name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reason</h4>
                <p className="text-sm text-gray-900 dark:text-white">{selectedReport.reason}</p>
              </div>

              {selectedReport.details && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Additional Details</h4>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {selectedReport.details}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about this report and any actions taken..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px]"
                  disabled={selectedReport.status !== 'pending'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            {selectedReport?.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleUpdateStatus('dismissed')}
                  className="border-gray-300 text-gray-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button 
                  onClick={() => handleUpdateStatus('resolved')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}