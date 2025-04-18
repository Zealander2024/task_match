import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Trash2, Edit, Eye, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { JobPost } from '../../types/database';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../components/ui/use-toast';

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

export function JobPostManagement() {
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

  useEffect(() => {
    fetchJobPosts();
  }, []);

  async function fetchJobPosts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .order('created_at', { ascending: false });

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
  }

  async function handleDelete(jobId: string) {
    if (!window.confirm('Are you sure you want to delete this job post?')) return;

    try {
      const { error } = await supabase
        .from('job_posts')
        .update({ status: 'deleted' })
        .eq('id', jobId);

      if (error) throw error;

      // Optimistically update the UI
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
      required_skills: jobPost.required_skills,
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

      // Update the local state
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 min-h-screen transition-colors duration-200 dark:bg-gray-900 dark:text-white">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Job Post Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage all job posts in the system
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
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
                        <button
                          onClick={() => handleEdit(post)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 dark:bg-black/50" />
          <Dialog.Content className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 shadow-lg">
                <Dialog.Title className="text-lg font-semibold mb-4">
                  Edit Job Post
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Type</label>
                      <input
                        type="text"
                        value={formData.job_type}
                        onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget</label>
                      <input
                        type="text"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'deleted' | 'draft' })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>

                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}





