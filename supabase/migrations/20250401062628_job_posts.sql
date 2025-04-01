-- Create job_posts table
CREATE TABLE IF NOT EXISTS job_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    budget TEXT NOT NULL,
    location TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    experience_level TEXT NOT NULL,
    work_schedule TEXT NOT NULL,
    additional_requirements TEXT,
    application_instructions TEXT NOT NULL,
    job_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_posts_employer_id ON job_posts(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON job_posts(category);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_job_posts_updated_at
    BEFORE UPDATE ON job_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- Allow employers to view their own job posts
CREATE POLICY "Employers can view their own job posts"
    ON job_posts FOR SELECT
    USING (auth.uid() = employer_id);

-- Allow employers to create job posts
CREATE POLICY "Employers can create job posts"
    ON job_posts FOR INSERT
    WITH CHECK (auth.uid() = employer_id);

-- Allow employers to update their own job posts
CREATE POLICY "Employers can update their own job posts"
    ON job_posts FOR UPDATE
    USING (auth.uid() = employer_id)
    WITH CHECK (auth.uid() = employer_id);

-- Allow employers to delete their own job posts
CREATE POLICY "Employers can delete their own job posts"
    ON job_posts FOR DELETE
    USING (auth.uid() = employer_id);

-- Allow job seekers to view active job posts
CREATE POLICY "Job seekers can view active job posts"
    ON job_posts FOR SELECT
    USING (status = 'active'); 