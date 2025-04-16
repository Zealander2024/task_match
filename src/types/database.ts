export interface Education {
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date?: string;
  current?: boolean;
  description?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  location: string;
  start_date: string;
  end_date?: string;
  current?: boolean;
  description: string;
  achievements?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_id?: string;
  url?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'employer' | 'job_seeker';
  bio?: string;
  work_email?: string;
  years_of_experience?: number;
  skills?: string[];
  avatar_url?: string;
  resume_url?: string;
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




