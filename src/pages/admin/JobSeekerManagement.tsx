import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { User, Trash2, Edit, Plus, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from '../../components/ui/use-toast';

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
}

interface JobSeekerFormData {
  full_name: string;
  bio: string;
  work_email: string;
  years_of_experience: number | null;
  skills: string[];
}

export function JobSeekerManagement() {
  const { isDarkMode } = useTheme();
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedJobSeeker, setSelectedJobSeeker] = useState<JobSeeker | null>(null);
  const [formData, setFormData] = useState<JobSeekerFormData>({
    full_name: '',
    bio: '',
    work_email: '',
    years_of_experience: null,
    skills: []
  });

  useEffect(() => {
    fetchJobSeekers();
  }, []);

  async function fetchJobSeekers() {
    try {
      console.log('Fetching job seekers...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          bio,
          work_email,
          years_of_experience,
          skills,
          avatar_url,
          resume_url,
          portfolio_images,
          created_at,
          updated_at
        `)
        .eq('role', 'job_seeker')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      if (!profilesData || profilesData.length === 0) {
        // If no job seekers exist, create a test job seeker
        const testJobSeeker = {
          full_name: 'Test Job Seeker',
          role: 'job_seeker',
          bio: 'This is a test job seeker account',
          work_email: 'testjobseeker@example.com',
          years_of_experience: 5,
          skills: ['JavaScript', 'React', 'Node.js'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert([testJobSeeker])
          .select();

        if (insertError) throw insertError;

        setJobSeekers(insertedData || []);
        console.log('Created test job seeker:', insertedData);
      } else {
        setJobSeekers(profilesData);
        console.log('Fetched job seekers:', profilesData);
      }
    } catch (error) {
      console.error('Error fetching job seekers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job seekers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(jobSeekerId: string) {
    if (!window.confirm('Are you sure you want to delete this job seeker?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', jobSeekerId);

      if (error) throw error;
      
      setJobSeekers(prev => prev.filter(seeker => seeker.id !== jobSeekerId));
      toast({
        title: "Success",
        description: "Job seeker deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting job seeker:', error);
      toast({
        title: "Error",
        description: "Failed to delete job seeker",
        variant: "destructive"
      });
    }
  }

  function handleEdit(jobSeeker: JobSeeker) {
    setSelectedJobSeeker(jobSeeker);
    setFormData({
      full_name: jobSeeker.full_name || '',
      bio: jobSeeker.bio || '',
      work_email: jobSeeker.work_email || '',
      years_of_experience: jobSeeker.years_of_experience || null,
      skills: jobSeeker.skills || []
    });
    setIsEditModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedJobSeeker?.id) {
      toast({
        title: "Error",
        description: "No job seeker selected for editing",
        variant: "destructive"
      });
      return;
    }

    try {
      const updateData = {
        full_name: formData.full_name,
        bio: formData.bio || null,
        work_email: formData.work_email || null,
        years_of_experience: formData.years_of_experience,
        skills: formData.skills,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', selectedJobSeeker.id)
        .select()
        .single();

      if (error) throw error;

      setJobSeekers(prev => 
        prev.map(seeker => 
          seeker.id === selectedJobSeeker.id ? { ...seeker, ...updateData } : seeker
        )
      );
      
      setIsEditModalOpen(false);
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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        Loading...
      </div>
    );
  }

  return (
    <div 
      data-theme={isDarkMode ? 'dark' : 'light'}
      className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
              Job Seeker Management
            </h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">
              Manage job seeker accounts and their information
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
                  <thead className="bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Profile</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Experience</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Skills</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Joined</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
                    {jobSeekers.map((seeker) => (
                      <tr key={seeker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {seeker.avatar_url ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={seeker.avatar_url}
                                  alt=""
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900 dark:text-white">{seeker.full_name}</div>
                              <div className="text-gray-500 dark:text-gray-400">{seeker.bio}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{seeker.work_email}</td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {seeker.years_of_experience} years
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {seeker.skills?.join(', ')}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(seeker.created_at).toLocaleDateString()}
                        </td>
                        <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(seeker)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(seeker.id)}
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
            <Dialog.Overlay className="fixed inset-0 bg-black/30 dark:bg-black/50 transition-colors duration-200" />
            <Dialog.Content className="fixed inset-0 z-10 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 transition-colors duration-200">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white transition-colors duration-200">
                      Edit Job Seeker
                    </Dialog.Title>
                    <Dialog.Close className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={formData.work_email}
                        onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        value={formData.years_of_experience || ''}
                        onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || null })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-200">
                        Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.skills.join(', ')}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                      />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <Dialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
                        Cancel
                      </Dialog.Close>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors duration-200"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}








