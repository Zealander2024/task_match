import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
import { X, Check, ShieldCheck, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '../../components/ui/use-toast';
import { format } from 'date-fns';
import debounce from 'lodash/debounce';

// Interfaces
interface JobSeeker {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  work_email: string | null;
  years_of_experience: number | null;
  skills: string[] | null;
  avatar_url: string | null;
  resume_url: string | null;
  portfolio_images: Array<{ url: string; link?: string }> | null;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
  is_approved: boolean;
  is_verified: boolean;
  approved_at?: string;
  verification_date?: string;
}

interface JobSeekerFormData {
  full_name: string;
  bio: string;
  work_email: string;
  years_of_experience: number | null;
  skills: string[];
}

interface LocalFilters {
  searchInput: string;
}

interface SearchFilters {
  query: string;
}

interface State {
  jobSeekers: JobSeeker[];
  loading: boolean;
  error: string | null;
  isEditModalOpen: boolean;
  selectedJobSeeker: JobSeeker | null;
}

export function JobSeekerManagement() {
  // Hooks
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // State
  const [state, setState] = useState<State>({
    jobSeekers: [],
    loading: true,
    error: null,
    isEditModalOpen: false,
    selectedJobSeeker: null,
  });

  const [formData, setFormData] = useState<JobSeekerFormData>({
    full_name: '',
    bio: '',
    work_email: '',
    years_of_experience: null,
    skills: []
  });

  const [localFilters, setLocalFilters] = useState<LocalFilters>({
    searchInput: ''
  });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: ''
  });

  // Create a stable debounced function
  const debouncedUpdateSearch = useCallback(
    debounce((newFilters: Partial<SearchFilters>) => {
      setSearchFilters(prev => ({ ...prev, ...newFilters }));
    }, 500),
    []
  );

  // Functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setLocalFilters(prev => ({ ...prev, searchInput: value }));
    debouncedUpdateSearch({ query: value });
  };

  const fetchJobSeekers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'job_seeker');

      // Apply search filter
      if (searchFilters.query) {
        const searchTerm = `%${searchFilters.query}%`;
        query = query.or(`full_name.ilike.${searchTerm},work_email.ilike.${searchTerm},bio.ilike.${searchTerm}`);
      }

      // Default sorting
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setState(prev => ({
        ...prev,
        jobSeekers: data || [],
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching job seekers:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch job seekers'
      }));
    }
  }, [searchFilters]);

  const handleApprove = async (jobSeekerId: string) => {
    if (!window.confirm('Are you sure you want to approve this job seeker?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          is_approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', jobSeekerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        jobSeekers: prev.jobSeekers.map(seeker =>
          seeker.id === jobSeekerId ? { ...seeker, status: 'active', is_approved: true } : seeker
        )
      }));

      toast({
        title: "Success",
        description: "Job seeker approved successfully"
      });
    } catch (error) {
      console.error('Error approving job seeker:', error);
      toast({
        title: "Error",
        description: "Failed to approve job seeker",
        variant: "destructive"
      });
    }
  };

  const handleVerifyAI = async (jobSeekerId: string) => {
    try {
      // Here you would typically call your AI verification service
      // For now, we'll just mark as verified
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true,
          verification_date: new Date().toISOString()
        })
        .eq('id', jobSeekerId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        jobSeekers: prev.jobSeekers.map(seeker =>
          seeker.id === jobSeekerId ? { ...seeker, is_verified: true } : seeker
        )
      }));

      toast({
        title: "Success",
        description: "Job seeker verified successfully"
      });
    } catch (error) {
      console.error('Error verifying job seeker:', error);
      toast({
        title: "Error",
        description: "Failed to verify job seeker",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (jobSeeker: JobSeeker) => {
    setState(prev => ({
      ...prev,
      selectedJobSeeker: jobSeeker,
      isEditModalOpen: true
    }));
    setFormData({
      full_name: jobSeeker.full_name,
      bio: jobSeeker.bio || '',
      work_email: jobSeeker.work_email || '',
      years_of_experience: jobSeeker.years_of_experience,
      skills: jobSeeker.skills || []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedJobSeeker?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.selectedJobSeeker.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        jobSeekers: prev.jobSeekers.map(seeker =>
          seeker.id === state.selectedJobSeeker?.id
            ? { ...seeker, ...formData }
            : seeker
        ),
        isEditModalOpen: false
      }));

      toast({
        title: "Success",
        description: "Job seeker updated successfully"
      });
    } catch (error) {
      console.error('Error updating job seeker:', error);
      toast({
        title: "Error",
        description: "Failed to update job seeker",
        variant: "destructive"
      });
    }
  };

  // Effects
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchJobSeekers();
    }
  }, [searchFilters, isAdmin, authLoading]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, authLoading, navigate]);

  // Render helpers
  if (authLoading || state.loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const SearchAndFilters = () => (
    <div className="mb-6">
      <div className="w-full md:w-1/2">
        <Input
          placeholder="Search by name, email, or bio..."
          value={localFilters.searchInput}
          onChange={handleInputChange}
          className="w-full"
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Job Seeker Management</h1>

        {/* Search input only */}
        <SearchAndFilters />

        {/* Job Seekers Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Skills</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {state.jobSeekers.map((seeker) => (
                <JobSeekerRow
                  key={seeker.id}
                  seeker={seeker}
                  onApprove={() => handleApprove(seeker.id)}
                  onVerifyAI={() => handleVerifyAI(seeker.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={state.isEditModalOpen}
        onClose={() => setState(prev => ({ ...prev, isEditModalOpen: false }))}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// Sub-components
const JobSeekerRow: React.FC<{
  seeker: JobSeeker;
  onApprove: () => void;
  onVerifyAI: () => void;
}> = ({ seeker, onApprove, onVerifyAI }) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10">
          {seeker.avatar_url ? (
            <img className="h-10 w-10 rounded-full" src={seeker.avatar_url} alt="" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span>{seeker.full_name[0]}</span>
            </div>
          )}
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium">{seeker.full_name}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">{seeker.work_email}</td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      {seeker.years_of_experience} years
    </td>
    <td className="px-6 py-4">
      <div className="flex flex-wrap gap-1">
        {seeker.skills?.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {skill}
          </span>
        ))}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        seeker.status === 'active' 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {seeker.status}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onApprove} 
        className="mr-2"
        disabled={seeker.is_approved}
      >
        <Check className={`h-4 w-4 ${seeker.is_approved ? 'text-green-500' : 'text-gray-500'}`} />
        <span className="ml-2">{seeker.is_approved ? 'Approved' : 'Approve'}</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onVerifyAI}
        disabled={seeker.is_verified}
      >
        <ShieldCheck className={`h-4 w-4 ${seeker.is_verified ? 'text-blue-500' : 'text-gray-500'}`} />
        <span className="ml-2">{seeker.is_verified ? 'Verified' : 'Verify AI'}</span>
      </Button>
    </td>
  </tr>
);

const EditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  formData: JobSeekerFormData;
  setFormData: (data: JobSeekerFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ isOpen, onClose, formData, setFormData, onSubmit }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Job Seeker</DialogTitle>
        <DialogClose asChild>
          <Button variant="ghost" size="sm" className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <Textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Work Email</label>
          <Input
            type="email"
            value={formData.work_email}
            onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Years of Experience</label>
          <Input
            type="number"
            value={formData.years_of_experience || ''}
            onChange={(e) => setFormData({
              ...formData,
              years_of_experience: e.target.value ? Number(e.target.value) : null
            })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Skills (comma-separated)</label>
          <Input
            value={formData.skills.join(', ')}
            onChange={(e) => setFormData({
              ...formData,
              skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);










