import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Loader2, CheckCircle, XCircle, ExternalLink, UserCheck, UserX, FileText } from 'lucide-react';
import { toast } from 'sonner';

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

export function VerificationControl() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersWithVerification();
  }, []);

  async function fetchUsersWithVerification() {
    try {
      setLoading(true);
      
      // First fetch users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, work_email, full_name, role, is_verified')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      // Then fetch verification requests for all users
      const { data: requests, error: requestsError } = await supabase
        .from('admin_verification_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching verification requests:', requestsError);
        throw new Error(`Failed to fetch verification requests: ${requestsError.message}`);
      }

      // Combine users with their verification requests
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

  // Preview document in new tab
  const handlePreviewDocument = async (documentUrl: string) => {
    if (!documentUrl) {
      toast.error("No document URL available");
      return;
    }
    
    try {
      // Extract the full path after 'verification-documents/'
      const urlObj = new URL(documentUrl);
      const fullPath = urlObj.pathname
        .split('verification-documents/')[1]
        .replace(/^\/+/, ''); // Remove leading slashes if any

      if (!fullPath) {
        throw new Error('Invalid document path');
      }

      // Get a signed URL that will work for a limited time
      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(fullPath, 60); // 60 seconds expiry

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

      // Start a transaction
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .update({
          is_verified: verify
        })
        .eq('id', userId)
        .select()
        .single();

      if (userError) throw userError;

      // Update verification request status if it exists
      const { data: request, error: requestError } = await supabase
        .from('admin_verification_requests')
        .update({
          status: verify ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (requestError && requestError.code !== 'PGRST116') { // Ignore if no matching request
        throw requestError;
      }

      // Update local state
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
      <h1 className="text-2xl font-bold mb-6">User Verification Control</h1>
      
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
              {users.map((user) => (
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'employer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${user.is_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_verified ? 'Verified' : 'Not Verified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.verificationRequest?.document_url ? (
                      <button
                        onClick={() => handlePreviewDocument(user.verificationRequest!.document_url)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 hover:text-blue-800 focus:outline-none"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Document
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No document</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_verified ? (
                      <button
                        onClick={() => handleVerificationAction(user.id, false)}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Unverify
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerificationAction(user.id, true)}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



