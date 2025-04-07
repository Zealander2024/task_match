-- Create resumes bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true);

-- Create policy to allow job seekers to upload their resumes
CREATE POLICY "Job seekers can upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow job seekers to read their own resumes
CREATE POLICY "Job seekers can read their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow employers to read resumes for their job posts
CREATE POLICY "Employers can read resumes for their job posts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  EXISTS (
    SELECT 1 FROM job_applications
    JOIN job_posts ON job_posts.id = job_applications.job_post_id
    WHERE job_posts.employer_id = auth.uid()
    AND job_applications.resume_url LIKE '%' || name
  )
); 