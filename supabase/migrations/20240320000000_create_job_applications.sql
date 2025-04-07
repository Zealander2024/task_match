-- Create job_applications table
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    job_seeker_id UUID NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    cover_letter TEXT,
    resume_url TEXT,
    contact_number TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_post_id, job_seeker_id)
);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Job seekers can view their own applications"
    ON job_applications FOR SELECT
    USING (auth.uid() = job_seeker_id);

CREATE POLICY "Job seekers can create applications"
    ON job_applications FOR INSERT
    WITH CHECK (auth.uid() = job_seeker_id);

CREATE POLICY "Employers can view applications for their job posts"
    ON job_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_posts
            WHERE job_posts.id = job_applications.job_post_id
            AND job_posts.employer_id = auth.uid()
        )
    );

CREATE POLICY "Employers can update application status"
    ON job_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM job_posts
            WHERE job_posts.id = job_applications.job_post_id
            AND job_posts.employer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_posts
            WHERE job_posts.id = job_applications.job_post_id
            AND job_posts.employer_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 