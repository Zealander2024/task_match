import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Loader2 } from 'lucide-react';
import type { Job, Application } from '../../types/database';
import { JobSearch, SearchFilters } from '../../components/JobSearch';
import { JobPostsList } from '../../components/JobPostsList';
import { Pagination } from '../../components/ui/Pagination';

interface SearchState {
  filters: SearchFilters;
  page: number;
  perPage: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({
    filters: {
      query: '',
      searchIn: {
        title: true,
        description: true,
        companyName: true,
      },
      jobType: [],
      experienceLevel: '',
      salary: [0, 200000],
      location: '',
      remote: false,
      skills: [],
      industry: '',
      postedWithin: '',
    },
    page: 1,
    perPage: 10,
  });

  const buildSearchQuery = useCallback((filters: SearchFilters) => {
    let query = supabase
      .from('job_posts')
      .select(`
        *,
        employer:employer_id(
          full_name,
          company_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('status', 'active');

    // Search conditions
    if (filters.query) {
      const searchConditions = [];
      const searchTerm = `%${filters.query}%`;
      
      if (filters.searchIn.title) {
        searchConditions.push(`title.ilike.${searchTerm}`);
      }
      if (filters.searchIn.description) {
        searchConditions.push(`description.ilike.${searchTerm}`);
      }
      if (filters.searchIn.companyName) {
        searchConditions.push(`employer.company_name.ilike.${searchTerm}`);
      }

      if (searchConditions.length > 0) {
        query = query.or(searchConditions.join(','));
      }
    }

    // Apply other filters
    if (filters.jobType.length > 0) {
      query = query.in('job_type', filters.jobType);
    }

    if (filters.experienceLevel) {
      query = query.eq('experience_level', filters.experienceLevel);
    }

    if (filters.salary[0] > 0 || filters.salary[1] < 200000) {
      query = query
        .gte('salary_min', filters.salary[0])
        .lte('salary_max', filters.salary[1]);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.remote) {
      query = query.eq('is_remote', true);
    }

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.skills.length > 0) {
      query = query.contains('required_skills', filters.skills);
    }

    // Posted within filter
    if (filters.postedWithin) {
      const date = new Date();
      switch (filters.postedWithin) {
        case '24 hours':
          date.setHours(date.getHours() - 24);
          break;
        case '7 days':
          date.setDate(date.getDate() - 7);
          break;
        case '14 days':
          date.setDate(date.getDate() - 14);
          break;
        case '30 days':
          date.setDate(date.getDate() - 30);
          break;
      }
      query = query.gte('created_at', date.toISOString());
    }

    return query;
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { filters, page, perPage } = searchState;
      let query = buildSearchQuery(filters);

      // Add pagination
      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      const { data, error: searchError, count } = await query;

      if (searchError) throw searchError;
      
      setJobs(data || []);
      setTotalJobs(count || 0);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchState, buildSearchQuery]);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, fetchJobs]);

  const handleSearch = (newFilters: SearchFilters) => {
    setSearchState(prev => ({
      ...prev,
      filters: newFilters,
      page: 1, // Reset to first page on new search
    }));
  };

  const handlePageChange = (newPage: number) => {
    setSearchState(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleJobSelect = (job: Job) => {
    // Handle job selection
    console.log('Selected job:', job);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Find Your Next Opportunity
            </h1>
            <p className="text-gray-600 mb-6">
              Search through thousands of job listings
            </p>
            
            <JobSearch 
              initialFilters={searchState.filters}
              onSearch={handleSearch}
              isLoading={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Results Summary */}
          {!loading && !error && (
            <div className="mb-4 text-gray-600">
              Found {totalJobs} matching jobs
            </div>
          )}

          {/* Job Listings */}
          <JobPostsList
            jobs={jobs}
            onJobSelect={handleJobSelect}
            isLoading={loading}
          />

          {/* Pagination */}
          {!loading && !error && jobs.length > 0 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={searchState.page}
                totalPages={Math.ceil(totalJobs / searchState.perPage)}
                onPageChange={handlePageChange}
                itemsPerPage={searchState.perPage}
                totalItems={totalJobs}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



