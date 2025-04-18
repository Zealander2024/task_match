import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { BarChart, LineChart, PieChart, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Users } from 'lucide-react';

interface Stats {
  totalEmployers: number;
  totalJobSeekers: number;
  totalJobs: number;
  totalApplications: number;
}

export function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalEmployers: 0,
    totalJobSeekers: 0,
    totalJobs: 0,
    totalApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Fetch employers count
      const { count: employersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'employer');

      // Fetch job seekers count
      const { count: jobSeekersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'job_seeker');

      // Fetch active jobs count
      const { count: jobsCount } = await supabase
        .from('job_posts')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      // Fetch total applications count
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact' });

      setStats({
        totalEmployers: employersCount || 0,
        totalJobSeekers: jobSeekersCount || 0,
        totalJobs: jobsCount || 0,
        totalApplications: applicationsCount || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  }
}
