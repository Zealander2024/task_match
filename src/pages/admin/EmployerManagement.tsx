import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Check, ShieldCheck, Search } from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useNavigate } from 'react-router-dom';

interface Employer {
  id: string;
  full_name: string;
  work_email: string;
  avatar_url?: string;
  years_of_experience: number | null;
  skills: string[];
  status: 'active' | 'inactive';
  is_approved: boolean;
  is_verified: boolean;
  approved_at?: string;
  verification_date?: string;
}

export function EmployerManagement() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchEmployers();
    }
  }, [isAdmin, authLoading]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, authLoading, navigate]);

  async function fetchEmployers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employer');

      if (error) throw error;

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

  async function handleApprove(employerId: string) {
    if (!window.confirm('Are you sure you want to approve this employer?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          is_approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', employerId);

      if (error) throw error;

      setEmployers(prev => prev.map(employer =>
        employer.id === employerId 
          ? { ...employer, status: 'active', is_approved: true }
          : employer
      ));

      toast({
        title: "Success",
        description: "Employer approved successfully"
      });
    } catch (error) {
      console.error('Error approving employer:', error);
      toast({
        title: "Error",
        description: "Failed to approve employer",
        variant: "destructive"
      });
    }
  }

  async function handleVerifyAI(employerId: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: true,
          verification_date: new Date().toISOString()
        })
        .eq('id', employerId);

      if (error) throw error;

      setEmployers(prev => prev.map(employer =>
        employer.id === employerId 
          ? { ...employer, is_verified: true }
          : employer
      ));

      toast({
        title: "Success",
        description: "Employer verified successfully"
      });
    } catch (error) {
      console.error('Error verifying employer:', error);
      toast({
        title: "Error",
        description: "Failed to verify employer",
        variant: "destructive"
      });
    }
  }

  const filteredEmployers = employers.filter(employer => {
    const matchesSearch = employer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employer.work_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employer.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && employer.status === selectedFilter;
  });

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Employer Management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage and oversee employer accounts
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search employers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="form-select rounded-md border-gray-300 dark:border-gray-700"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployers.map((employer) => (
                <tr key={employer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {employer.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={employer.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span>{employer.full_name[0]}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{employer.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{employer.work_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {employer.years_of_experience} years
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {employer.skills?.map((skill, index) => (
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
                      employer.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {employer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleApprove(employer.id)} 
                      className="mr-2"
                      disabled={employer.is_approved}
                    >
                      <Check className={`h-4 w-4 ${employer.is_approved ? 'text-green-500' : 'text-gray-500'}`} />
                      <span className="ml-2">{employer.is_approved ? 'Approved' : 'Approve'}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleVerifyAI(employer.id)}
                      disabled={employer.is_verified}
                    >
                      <ShieldCheck className={`h-4 w-4 ${employer.is_verified ? 'text-blue-500' : 'text-gray-500'}`} />
                      <span className="ml-2">{employer.is_verified ? 'Verified' : 'Verify AI'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}









