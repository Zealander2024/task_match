import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { User, Trash2, Edit, Plus, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from '../../components/ui/use-toast';

interface Employer {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  work_email: string | null;
  years_of_experience: number | null;
  skills: string[] | null;
  avatar_url: string | null;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployerFormData {
  full_name: string;
  bio: string;
  work_email: string;
  years_of_experience: number | null;
  skills: string[];
}

export function EmployerManagement() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [formData, setFormData] = useState<EmployerFormData>({
    full_name: '',
    bio: '',
    work_email: '',
    years_of_experience: null,
    skills: []
  });

  useEffect(() => {
    fetchEmployers();
  }, []);

  async function fetchEmployers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched employers:', data);
      setEmployers(data || []);
    } catch (error) {
      console.error('Error fetching employers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(employerId: string) {
    if (!window.confirm('Are you sure you want to delete this employer?')) return;

    try {
      // First, delete the auth user
      const { error: authError } = await supabase.rpc('delete_user', {
        user_id: employerId
      });

      if (authError) throw authError;

      // Then, delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employerId);

      if (profileError) throw profileError;
      
      setEmployers(employers.filter(emp => emp.id !== employerId));
      toast({
        title: "Success",
        description: "Employer deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting employer:', error);
      toast({
        title: "Error",
        description: "Failed to delete employer. Make sure you have admin privileges.",
        variant: "destructive"
      });
    }
  }

  function handleEdit(employer: Employer) {
    setSelectedEmployer(employer);
    setFormData({
      full_name: employer.full_name || '',
      bio: employer.bio || '',
      work_email: employer.work_email || '',
      years_of_experience: employer.years_of_experience || null,
      skills: employer.skills || []
    });
    setIsEditModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedEmployer?.id) {
      toast({
        title: "Error",
        description: "No employer selected for editing",
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
        .eq('id', selectedEmployer.id)
        .select()
        .single();

      if (error) throw error;

      setEmployers(employers.map(emp => 
        emp.id === selectedEmployer.id ? { ...emp, ...updateData } : emp
      ));
      
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Employer updated successfully"
      });
    } catch (error) {
      console.error('Error updating employer:', error);
      toast({
        title: "Error",
        description: "Failed to update employer",
        variant: "destructive"
      });
    }
  }

  // Add new employer function
  async function handleAddEmployer() {
    const newEmployer: Partial<Employer> = {
      full_name: formData.full_name,
      role: 'employer',
      bio: formData.bio || null,
      work_email: formData.work_email || null,
      years_of_experience: formData.years_of_experience,
      skills: formData.skills,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newEmployer])
        .select()
        .single();

      if (error) throw error;

      setEmployers([data, ...employers]);
      setIsEditModalOpen(false);
      toast({
        title: "Success",
        description: "Employer added successfully"
      });
    } catch (error) {
      console.error('Error adding employer:', error);
      toast({
        title: "Error",
        description: "Failed to add employer",
        variant: "destructive"
      });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-white dark:bg-gray-900">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Employer Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage employer accounts and their information
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Full Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Experience</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Skills</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Joined</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {employers.length > 0 ? (
                    employers.map((employer) => (
                      <tr key={employer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white">
                          {employer.full_name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {employer.work_email || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {employer.years_of_experience ? `${employer.years_of_experience} years` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {employer.skills ? employer.skills.join(', ') : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(employer.created_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(employer)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(employer.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No employers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedEmployer ? 'Edit Employer' : 'Add Employer'}
              </Dialog.Title>
              <Dialog.Close className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.work_email}
                  onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={formData.years_of_experience || ''}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skills
                </label>
                <input
                  type="text"
                  value={formData.skills.join(', ')}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value.split(', ').filter(s => s.trim()) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md"
                >
                  {selectedEmployer ? 'Save Changes' : 'Add Employer'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}





