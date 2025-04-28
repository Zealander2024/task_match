import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Trash2, Edit, X, Search, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../../components/ui/dialog';
import { format } from 'date-fns';
import { JobPost } from '../../types/database';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../components/ui/use-toast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';

interface JobPostFormData {
  title: string;
  description: string;
  company_name: string;
  location: string;
  job_type: string;
  budget: string;
  work_schedule: string;
  required_skills: string[];
  status: 'active' | 'deleted' | 'draft';
}

interface SearchFilters {
  query: string;
  status: 'all' | 'active' | 'deleted' | 'draft';
  datePosted: string;
  jobType: string;
  location: string;
}

export function JobPostManagement() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedJobPost, setSelectedJobPost] = useState<JobPost | null>(null);
  const [formData, setFormData] = useState<JobPostFormData>({
    title: '',
    description: '',
    company_name: '',
    location: '',
    job_type: '',
    budget: '',
    work_schedule: '',
    required_skills: [],
    status: 'active'
  });
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    status: 'all',
    datePosted: '',
    jobType: '',
    location: ''
  });

  const buildSearchQuery = useCallback(() => {
    let query = supabase
      .from('job_posts')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply search filters
    if (searchFilters.query) {
      query = query.or(`
        title.ilike.%${searchFilters.query}%,
        description.ilike.%${searchFilters.query}%,
        company_name.ilike.%${searchFilters.query}%
      `);
    }

    if (searchFilters.status !== 'all') {
      query = query.eq('status', searchFilters.status);
    }

    if (searchFilters.jobType) {
      query = query.eq('job_type', searchFilters.jobType);
    }

    if (searchFilters.location) {
      query = query.ilike('location', `%${searchFilters.location}%`);
    }

    if (searchFilters.datePosted) {
      const date = new Date();
      switch (searchFilters.datePosted) {
        case 'today':
          date.setDate(date.getDate() - 1);
          break;
        case 'week':
          date.setDate(date.getDate() - 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() - 1);
          break;
      }
      query = query.gte('created_at', date.toISOString());
    }

    return query;
  }, [searchFilters]);

  const fetchJobPosts = async () => {
    try {
      setLoading(true);
      const query = buildSearchQuery();
      const { data, error } = await query;

      if (error) throw error;

      setJobPosts(data || []);
    } catch (error) {
      console.error('Error fetching job posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchJobPosts();
    }
  }, [isAdmin, authLoading, searchFilters]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, authLoading, navigate]);

  async function handleDelete(jobId: string) {
    if (!window.confirm('Are you sure you want to delete this job post?')) return;

    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'deleted' })
        .eq('id', jobId);

      if (error) throw error;

      setJobPosts(prev => 
        prev.map(post => 
          post.id === jobId ? { ...post, status: 'deleted' } : post
        )
      );

      toast({
        title: "Success",
        description: "Job post deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting job post:', error);
      toast({
        title: "Error",
        description: "Failed to delete job post",
        variant: "destructive"
      });
    }
  }

  function handleEdit(jobPost: JobPost) {
    setSelectedJobPost(jobPost);
    setFormData({
      title: jobPost.title,
      description: jobPost.description,
      company_name: jobPost.company_name,
      location: jobPost.location,
      job_type: jobPost.job_type,
      budget: jobPost.budget,
      work_schedule: jobPost.work_schedule,
      required_skills: jobPost.required_skills || [],
      status: jobPost.status as 'active' | 'deleted' | 'draft'
    });
    setIsEditModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedJobPost?.id) {
      toast({
        title: "Error",
        description: "No job post selected for editing",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('job_posts')
        .update(updateData)
        .eq('id', selectedJobPost.id)
        .select()
        .single();

      if (error) throw error;

      setJobPosts(prev => 
        prev.map(post => 
          post.id === selectedJobPost.id ? { ...post, ...updateData } : post
        )
      );

      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Job post updated successfully"
      });
    } catch (error) {
      console.error('Error updating job post:', error);
      toast({
        title: "Error",
        description: "Failed to update job post",
        variant: "destructive"
      });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Job Post Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage all job posts in the system
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search job posts..."
              value={searchFilters.query}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={searchFilters.status}
            onChange={(e) => setSearchFilters(prev => ({ 
              ...prev, 
              status: e.target.value as SearchFilters['status']
            }))}
            className="rounded-md border-gray-300 dark:border-gray-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={searchFilters.datePosted}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, datePosted: e.target.value }))}
            className="rounded-md border-gray-300 dark:border-gray-700"
          >
            <option value="">Any Time</option>
            <option value="today">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <select
            value={searchFilters.jobType}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, jobType: e.target.value }))}
            className="rounded-md border-gray-300 dark:border-gray-700"
          >
            <option value="">All Job Types</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <Input
            placeholder="Location..."
            value={searchFilters.location}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
            className="w-32"
          />
        </div>
      </div>

      <div className="mt-8 overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Job Details</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Company</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Posted</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {jobPosts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">{post.title}</span>
                    <span className="text-gray-500 dark:text-gray-400">{post.job_type}</span>
                    <span className="text-gray-500 dark:text-gray-400">{post.budget}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{post.company_name}</td>
                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{post.location}</td>
                <td className="px-3 py-4 text-sm">
                  <Badge
                    variant={post.status === 'active' ? 'default' : 'secondary'}
                    className="dark:bg-gray-700 dark:text-gray-200"
                  >
                    {post.status}
                  </Badge>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(post.created_at), 'MMM d, yyyy')}
                </td>
                <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <Button
                    onClick={() => handleEdit(post)}
                    variant="ghost"
                    className="mr-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(post.id)}
                    variant="ghost"
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Post</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" className="h-4 w-4 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Job Type</label>
                <Input
                  value={formData.job_type}
                  onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Budget</label>
                <Input
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Work Schedule</label>
              <Input
                value={formData.work_schedule}
                onChange={(e) => setFormData({ ...formData, work_schedule: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Required Skills (comma-separated)</label>
              <Input
                value={formData.required_skills.join(', ')}
                onChange={(e) => setFormData({ ...formData, required_skills: e.target.value.split(',').map(s => s.trim()) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'deleted' | 'draft' })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}




