-- First, ensure RLS is enabled
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Job seekers can create applications" ON job_applications;
DROP POLICY IF EXISTS "job_seekers_can_apply" ON job_applications;
DROP POLICY IF EXISTS "Job seekers can view their own applications" ON job_applications;
DROP POLICY IF EXISTS "Employers can view applications for their job posts" ON job_applications;
DROP POLICY IF EXISTS "Employers can update application status" ON job_applications;

-- Create clean policies with table aliases
CREATE POLICY "Job seekers can create applications"
ON job_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = job_applications.job_seeker_id AND
  EXISTS (
    SELECT 1 FROM job_posts jp
    WHERE jp.id = job_applications.job_post_id
  )
);

CREATE POLICY "Job seekers can view their own applications"
ON job_applications FOR SELECT
TO authenticated
USING (auth.uid() = job_applications.job_seeker_id);

CREATE POLICY "Employers can view applications for their job posts"
ON job_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_posts jp
    WHERE jp.id = job_applications.job_post_id
    AND jp.employer_id = auth.uid()
  )
);

CREATE POLICY "Employers can update application status"
ON job_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_posts jp
    WHERE jp.id = job_applications.job_post_id
    AND jp.employer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM job_posts jp
    WHERE jp.id = job_applications.job_post_id
    AND jp.employer_id = auth.uid()
  )
);