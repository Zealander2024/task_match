import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Loader2, FileText, UserCheck, UserX, Users, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { EmployerVerificationReview } from '../../components/admin/EmployerVerificationReview';

interface UserProfile {
  id: string;
  work_email: string;
  full_name: string;
  role: 'employer' | 'job_seeker';
  is_verified: boolean;
}

interface VerificationRequest {
  id: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}

interface UserWithVerification extends UserProfile {
  verificationRequest?: VerificationRequest;
}

export function AdminVerificationControl() {
  const [users, setUsers] = useState<UserWithVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsersWithVerification();
  }, []);

  async function fetchUsersWithVerification() {
    try {
      setLoading(true);
      
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, work_email, full_name, role, is_verified')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      const { data: requests, error: requestsError } = await supabase
        .from('admin_verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (requestsError) {
        throw new Error(`Failed to fetch verification requests: ${requestsError.message}`);
      }

      const usersWithVerification = users.map(user => ({
        ...user,
        verificationRequest: requests?.find(req => req.user_id === user.id)
      }));

      setUsers(usersWithVerification);
    } catch (error) {
      console.error('Error in fetchUsersWithVerification:', error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  }

  const handlePreviewDocument = async (documentUrl: string) => {
    if (!documentUrl) {
      toast.error("No document URL available");
      return;
    }
    
    try {
      const urlObj = new URL(documentUrl);
      const fullPath = urlObj.pathname
        .split('verification-documents/')[1]
        .replace(/^\/+/, '');

      if (!fullPath) {
        throw new Error('Invalid document path');
      }

      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(fullPath, 60);

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Failed to generate signed URL');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error("Failed to open document preview");
    }
  };

  async function handleVerificationAction(userId: string, verify: boolean) {
    try {
      setLoading(true);

      const { data: user, error: userError } = await supabase
        .from('profiles')
        .update({
          is_verified: verify
        })
        .eq('id', userId)
        .select()
        .single();

      if (userError) throw userError;

      const { data: request, error: requestError } = await supabase
        .from('admin_verification_requests')
        .update({
          status: verify ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (requestError && requestError.code !== 'PGRST116') {
        throw requestError;
      }

      setUsers(prev => prev.map(u => 
        u.id === userId
          ? { 
              ...u, 
              is_verified: verify,
              verificationRequest: request || u.verificationRequest
            }
          : u
      ));

      toast.success(`User ${verify ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error(`Failed to ${verify ? 'verify' : 'unverify'} user`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Verification Control</h1>
      
      <Tabs defaultValue="job-seekers">
        <TabsList className="mb-4">
          <TabsTrigger value="job-seekers" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Job Seekers
          </TabsTrigger>
          <TabsTrigger value="employers" className="flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Employers
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="job-seekers">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users
                    .filter(user => user.role === 'job_seeker')
                    .map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.work_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_verified ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : user.verificationRequest?.status === 'pending' ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                        ) : user.verificationRequest?.status === 'rejected' ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.verificationRequest ? (
                          <button
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            onClick={() => handlePreviewDocument(user.verificationRequest?.document_url)}
                          >
                            <FileText className="h-4 w-4 mr-1" /> View Document
                          </button>
                        ) : (
                          <span className="text-gray-500">No document</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            className="text-green-600 hover:text-green-900 flex items-center px-2 py-1 rounded-md hover:bg-green-50"
                            onClick={() => handleVerificationAction(user.id, true)}
                            disabled={user.is_verified || !user.verificationRequest}
                          >
                            <UserCheck className="h-4 w-4 mr-1" /> Verify
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 flex items-center px-2 py-1 rounded-md hover:bg-red-50"
                            onClick={() => handleVerificationAction(user.id, false)}
                            disabled={!user.is_verified && !user.verificationRequest}
                          >
                            <UserX className="h-4 w-4 mr-1" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="employers">
          <EmployerVerificationReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}