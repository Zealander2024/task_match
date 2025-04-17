import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { debounce } from 'lodash';

const jobTypes = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Internship',
  'Freelance'
];

const experienceLevels = [
  'Entry Level',
  'Mid Level',
  'Senior',
  'Lead',
  'Manager'
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Marketing',
  'Construction',
  'Hospitality',
  'Other'
];

const timeFrames = [
  '24 hours',
  '7 days',
  '14 days',
  '30 days'
];

export interface SearchFilters {
  query: string;
  searchIn: {
    title: boolean;
    description: boolean;
    companyName: boolean;
  };
  jobType: string[];
  experienceLevel: string;
  salary: [number, number];
  location: string;
  remote: boolean;
  skills: string[];
  industry: string;
  postedWithin: string;
}

const initialFilters: SearchFilters = {
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
};

interface JobSearchProps {
  initialFilters?: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  className?: string;
}

export function JobSearch({ 
  initialFilters = {
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
  onSearch,
  isLoading,
  className 
}: JobSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [advancedSearch, setAdvancedSearch] = useState(false);
  
  // Debounce search to prevent too many requests
  const debouncedSearch = useCallback(
    debounce((filters: SearchFilters) => {
      onSearch(filters);
    }, 300),
    [onSearch]
  );

  // Update search when filters change
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, debouncedSearch]);

  const getActiveFiltersCount = useCallback((currentFilters: SearchFilters) => {
    let count = 0;
    if (currentFilters.query.trim()) count++;
    if (currentFilters.jobType.length > 0) count++;
    if (currentFilters.experienceLevel) count++;
    if (currentFilters.location.trim()) count++;
    if (currentFilters.remote) count++;
    if (currentFilters.skills.length > 0) count++;
    if (currentFilters.industry) count++;
    if (currentFilters.postedWithin) count++;
    if (currentFilters.salary[0] !== 0 || currentFilters.salary[1] !== 200000) count++;
    
    // Count active search fields
    const searchInCount = Object.values(currentFilters.searchIn).filter(Boolean).length;
    if (searchInCount < 3 && currentFilters.query.trim()) count++;
    
    return count;
  }, []);

  const handleSearch = () => {
    const hasActiveFilters = 
      filters.query.trim() !== '' ||
      filters.jobType.length > 0 ||
      filters.experienceLevel !== '' ||
      filters.location.trim() !== '' ||
      filters.remote ||
      filters.skills.length > 0 ||
      filters.industry !== '' ||
      filters.postedWithin !== '' ||
      (filters.salary[0] !== 0 || filters.salary[1] !== 200000);

    if (hasActiveFilters) {
      onSearch(filters);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchInChange = (field: keyof SearchFilters['searchIn']) => {
    setFilters(prev => ({
      ...prev,
      searchIn: {
        ...prev.searchIn,
        [field]: !prev.searchIn[field],
      },
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddSkill = () => {
    if (newSkill && !filters.skills.includes(newSkill)) {
      handleFilterChange('skills', [...filters.skills, newSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    handleFilterChange('skills', filters.skills.filter(s => s !== skill));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    onSearch(initialFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search jobs by title, company, or keywords..."
            className="w-full h-10 pl-10 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        {/* Advanced Search Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdvancedSearch(!advancedSearch)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {advancedSearch ? 'Hide Advanced Search' : 'Show Advanced Search'}
          </button>
        </div>

        {/* Advanced Search Options */}
        {advancedSearch && (
          <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-md">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.searchIn.title}
                onChange={() => handleSearchInChange('title')}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Search in Title</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.searchIn.description}
                onChange={() => handleSearchInChange('description')}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Search in Description</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.searchIn.companyName}
                onChange={() => handleSearchInChange('companyName')}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Search in Company Name</span>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Search
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFiltersOpen(!isFiltersOpen);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {getActiveFiltersCount(filters) > 0 && (
              <span className="ml-1 px-2 py-0.5 text-sm bg-blue-100 text-blue-800 rounded-full">
                {getActiveFiltersCount(filters)}
              </span>
            )}
          </button>
        </div>
      </div>

      {isFiltersOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] sm:w-[540px] bg-white shadow-xl p-6 overflow-y-auto z-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Job Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Job Type</label>
              <div className="flex flex-wrap gap-2">
                {jobTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const newTypes = filters.jobType.includes(type)
                        ? filters.jobType.filter(t => t !== type)
                        : [...filters.jobType, type];
                      handleFilterChange('jobType', newTypes);
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.jobType.includes(type)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Experience Level</label>
              <select
                value={filters.experienceLevel}
                onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select experience level</option>
                {experienceLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                placeholder="City, State, or Country"
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="remote"
                  checked={filters.remote}
                  onChange={(e) => handleFilterChange('remote', e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="remote" className="text-sm text-gray-700">Remote positions only</label>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Required Skills</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a skill"
                  className="flex-1 h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <button
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.skills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Industry</label>
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select industry</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Posted Within */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Posted Within</label>
              <select
                value={filters.postedWithin}
                onChange={(e) => handleFilterChange('postedWithin', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select time frame</option>
                {timeFrames.map(time => (
                  <option key={time} value={time}>Last {time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-2 justify-end">
            <button
              onClick={() => setIsFiltersOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleSearch();
                setIsFiltersOpen(false);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}








