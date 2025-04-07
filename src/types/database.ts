export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: 'employer' | 'job_seeker';
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  employer_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string;
  salary_range: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract';
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  resume_url: string;
  cover_letter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface JobPost {
  id: string;
  employer_id: string;
  company_name: string;
  company_logo_url?: string;
  title: string;
  category: string;
  description: string;
  budget: string;
  location: string;
  required_skills: string[];
  experience_level: string;
  work_schedule: string;
  additional_requirements: string;
  application_instructions: string;
  job_type: string;
  start_date: string;
  end_date: string;
  payment_method: string;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
  updated_at: string;
  employer_avatar_url?: string;
  employer_email?: string;
}