-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(job_seeker_id, job_id)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own saved jobs
CREATE POLICY "Users can view their own saved jobs"
    ON saved_jobs
    FOR SELECT
    USING (auth.uid() = job_seeker_id);

-- Policy to allow users to save jobs
CREATE POLICY "Users can save jobs"
    ON saved_jobs
    FOR INSERT
    WITH CHECK (auth.uid() = job_seeker_id);

-- Policy to allow users to unsave their saved jobs
CREATE POLICY "Users can delete their saved jobs"
    ON saved_jobs
    FOR DELETE
    USING (auth.uid() = job_seeker_id);