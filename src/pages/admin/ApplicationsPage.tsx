import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Loader2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  created_at: string;
  email: string;
  contact_number: string;
  status: string;
  resume_url: string | null;
  cover_letter: string;
  job_posts: {
    title: string;
    company_name: string;
  };
  job_seeker_profile: {
    full_name: string;
  };
}

export function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, [searchTerm, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('job_applications')
        .select(`
          id,
          created_at,
          email,
          contact_number,
          status,
          resume_url,
          cover_letter,
          job_seeker_id,
          job_posts (
            title,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `email.ilike.%${searchTerm}%,job_posts.title.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: applications, error } = await query;

      if (error) throw error;

      // Fetch profiles for job seekers
      if (applications && applications.length > 0) {
        const jobSeekerIds = applications.map(app => app.job_seeker_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', jobSeekerIds);

        if (profilesError) throw profilesError;

        // Create a map of profiles
        const profileMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, { id: string; full_name: string }>);

        // Combine applications with profiles
        const enrichedApplications = applications.map(app => ({
          ...app,
          job_posts: app.job_posts || { title: 'Unknown', company_name: 'Unknown' },
          job_seeker_profile: {
            full_name: profileMap[app.job_seeker_id]?.full_name || 'Unknown'
          }
        }));

        setApplications(enrichedApplications as Application[]);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      interviewing: 'bg-blue-100 text-blue-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Applications</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="interviewing">Interviewing</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Job Position</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>
                  {format(new Date(application.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{application.job_seeker_profile.full_name}</TableCell>
                <TableCell>{application.job_posts.title}</TableCell>
                <TableCell>{application.job_posts.company_name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>{application.email}</div>
                    <div className="text-sm text-gray-500">
                      {application.contact_number}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {application.resume_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(application.resume_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}


