/*
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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

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

-- Create function to handle updating timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_updated_at_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_updated_at_jobs
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_updated_at_applications
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();