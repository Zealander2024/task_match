import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar, 
  User, 
  ExternalLink, 
  Shield, 
  Loader2, 
  BarChart4 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface VerificationRequest {
  id: string;
  employer_id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  employer_profile?: {
    full_name: string;
    email: string;
  };
}

export function EmployerVerificationReview() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch all verification requests with employer profile info
      const { data, error } = await supabase
        .from('employer_verification_requests')
        .select(`
          *,
          employer_profile:profiles(full_name, email)
        `)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedRequests = data.map(item => ({
        ...item,
        employer_profile: item.employer_profile as { full_name: string; email: string }
      }));
      
      setRequests(formattedRequests);
      
      // Separate pending and completed requests
      const pending = formattedRequests.filter(req => req.status === 'pending');
      const completed = formattedRequests.filter(req => req.status !== 'pending');
      
      setPendingRequests(pending);
      setCompletedRequests(completed);
      
      // Update stats
      setStats({
        pending: pending.length,
        approved: formattedRequests.filter(req => req.status === 'approved').length,
        rejected: formattedRequests.filter(req => req.status === 'rejected').length,
        total: formattedRequests.length
      });
      
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('Failed to fetch verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteChange = (id: string, note: string) => {
    setAdminNotes(prev => ({
      ...prev,
      [id]: note
    }));
  };

  const handleApprove = async (request: VerificationRequest) => {
    await updateVerificationStatus(request, 'approved');
  };

  const handleReject = async (request: VerificationRequest) => {
    await updateVerificationStatus(request, 'rejected');
  };

  const updateVerificationStatus = async (request: VerificationRequest, status: 'approved' | 'rejected') => {
    try {
      setProcessingIds(prev => [...prev, request.id]);
      
      // Update the verification request status
      const { error: updateError } = await supabase
        .from('employer_verification_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes[request.id] || null
        })
        .eq('id', request.id);
      
      if (updateError) throw updateError;
      
      // If approved, update the employer's profile
      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_verified: true,
            verification_date: new Date().toISOString(),
            verification_document: request.document_url
          })
          .eq('id', request.employer_id);
        
        if (profileError) throw profileError;
      }
      
      toast.success(`Verification request ${status}`);
      
      // Refresh the data
      fetchVerificationRequests();
    } catch (error) {
      console.error(`Error ${status} verification:`, error);
      toast.error(`Failed to ${status} verification`);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== request.id));
    }
  };

  const VerificationRequestCard = ({ request }: { request: VerificationRequest }) => {
    const isProcessing = processingIds.includes(request.id);
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                {request.employer_profile?.full_name || 'Unknown Employer'}
              </CardTitle>
              <CardDescription>
                {request.employer_profile?.email || 'No email available'}
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Submitted {format(new Date(request.submitted_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Document Preview</span>
                </div>
                <div className="mt-2 border rounded-md overflow-hidden">
                  {request.document_url.endsWith('.pdf') ? (
                    <div className="bg-slate-100 h-[200px] flex items-center justify-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => window.open(request.document_url, '_blank')}
                        className="flex items-center"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View PDF Document
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={request.document_url} 
                        alt="ID Document"
                        className="w-full max-h-[200px] object-contain"
                      />
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => window.open(request.document_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium">
                  Admin Notes
                </label>
                <Textarea
                  placeholder="Add notes about this verification"
                  value={adminNotes[request.id] || request.admin_notes || ''}
                  onChange={(e) => handleNoteChange(request.id, e.target.value)}
                  className="mt-1"
                  disabled={request.status !== 'pending' || isProcessing}
                />
              </div>
            </div>
            
            <div className="col-span-1">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Actions</h3>
                  
                  {request.status === 'pending' ? (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleReject(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-md ${
                      request.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <div className="flex items-center">
                        {request.status === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-medium capitalize">{request.status}</span>
                      </div>
                      {request.reviewed_at && (
                        <div className="text-xs mt-1">
                          {format(new Date(request.reviewed_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Employer Info</h3>
                  <div className="p-3 bg-slate-50 rounded-md">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <User className="h-4 w-4" />
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {request.employer_profile?.full_name || 'Unknown'}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => window.open(`/admin/employers/${request.employer_id}`, '_blank')}
                    >
                      View Employer Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Employer ID Verification</h2>
        <p className="text-muted-foreground">
          Manage employer ID verification requests
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart4 className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-yellow-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold">{stats.pending}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <h3 className="text-2xl font-bold">{stats.approved}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <h3 className="text-2xl font-bold">{stats.rejected}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No pending verification requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(request => (
              <VerificationRequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : completedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No completed verification requests</p>
              </CardContent>
            </Card>
          ) : (
            completedRequests.map(request => (
              <VerificationRequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 