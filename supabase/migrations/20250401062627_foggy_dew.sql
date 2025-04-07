ERROR:  42P07: relation "job_posts" already exists/*
  # Initial Schema for TaskMatch Job Hiring Web App

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `role` (user role: admin, employer, job_seeker)
      - `full_name` (text)
      - `avatar_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `companies`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text)
      - `logo_url` (text, optional)
      - `website` (text, optional)
      - `location` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `jobs`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `title` (text)
      - `description` (text)
      - `requirements` (text)
      - `salary_range` (text)
      - `location` (text)
      - `type` (text: full-time, part-time, contract)
      - `status` (text: draft, published, closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `applications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `applicant_id` (uuid, references profiles)
      - `resume_url` (text)
      - `cover_letter` (text)
      - `status` (text: pending, accepted, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `job_posts`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references auth.users)
      - `company_name` (text)
      - `company_logo_url` (text)
      - `title` (text)
      - `category` (text)
      - `description` (text)
      - `budget` (text)
      - `location` (text)
      - `required_skills` (text[])
      - `experience_level` (text)
      - `work_schedule` (text)
      - `additional_requirements` (text)
      - `application_instructions` (text)
      - `job_type` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `payment_method` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `employer_avatar_url` (text)
      - `employer_email` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for each table based on user roles
    - Ensure data privacy and access control
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'employer', 'job_seeker')),
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  website text,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  requirements text NOT NULL,
  salary_range text NOT NULL,
  location text NOT NULL,
  type text NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  resume_url text NOT NULL,
  cover_letter text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_posts table
CREATE TABLE job_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employer_id UUID REFERENCES auth.users(id) NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  budget TEXT NOT NULL,
  location TEXT NOT NULL,
  required_skills TEXT[] NOT NULL,
  experience_level TEXT NOT NULL,
  work_schedule TEXT NOT NULL,
  additional_requirements TEXT,
  application_instructions TEXT NOT NULL,
  job_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  employer_avatar_url TEXT,
  employer_email TEXT
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Companies are viewable by everyone"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Employers can insert their companies"
  ON companies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employer'
    )
  );

CREATE POLICY "Employers can update their companies"
  ON companies FOR UPDATE
  USING (
    employer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employer'
    )
  );

-- Jobs policies
CREATE POLICY "Published jobs are viewable by everyone"
  ON jobs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Employers can view all their jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = jobs.company_id
      AND companies.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employers can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_id
      AND companies.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employers can update their jobs"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = jobs.company_id
      AND companies.employer_id = auth.uid()
    )
  );

-- Applications policies
CREATE POLICY "Job seekers can view their applications"
  ON applications FOR SELECT
  USING (applicant_id = auth.uid());

CREATE POLICY "Employers can view applications for their jobs"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN companies ON companies.id = jobs.company_id
      WHERE jobs.id = applications.job_id
      AND companies.employer_id = auth.uid()
    )
  );

CREATE POLICY "Job seekers can submit applications"
  ON applications FOR INSERT
  WITH CHECK (
    auth.uid() = applicant_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'job_seeker'
    )
  );

-- Drop existing job posts policies
DROP POLICY IF EXISTS "Employers can view their own job posts" ON job_posts;
DROP POLICY IF EXISTS "Employers can insert their own job posts" ON job_posts;
DROP POLICY IF EXISTS "Employers can update their own job posts" ON job_posts;
DROP POLICY IF EXISTS "Employers can delete their own job posts" ON job_posts;
DROP POLICY IF EXISTS "Job seekers can view active job posts" ON job_posts;
DROP POLICY IF EXISTS "Public can view active job posts" ON job_posts;
DROP POLICY IF EXISTS "Admins can view all job posts" ON job_posts;

-- Create updated job posts policies
CREATE POLICY "Employers can view their own job posts"
  ON job_posts FOR SELECT
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own job posts"
  ON job_posts FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own job posts"
  ON job_posts FOR UPDATE
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own job posts"
  ON job_posts FOR DELETE
  USING (auth.uid() = employer_id);

CREATE POLICY "Job seekers can view active job posts"
  ON job_posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can view active job posts"
  ON job_posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can view all job posts"
  ON job_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add employer avatar and email columns to job_posts table
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS employer_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS employer_email TEXT;

-- Update the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_job_posts_updated_at ON job_posts;

-- Create the trigger
CREATE TRIGGER update_job_posts_updated_at
  BEFORE UPDATE ON job_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();