-- Create job_seekers table
CREATE TABLE job_seekers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    bio TEXT,
    skills TEXT[],
    experience_years INTEGER,
    education TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE job_seekers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Job seekers can view their own profile"
    ON job_seekers FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Job seekers can update their own profile"
    ON job_seekers FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE TRIGGER update_job_seekers_updated_at
    BEFORE UPDATE ON job_seekers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 