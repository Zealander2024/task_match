-- Drop and recreate the profiles table with the correct structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT CHECK (role IN ('employer', 'job_seeker')),
    bio TEXT,
    work_email TEXT,
    years_of_experience INTEGER,
    skills TEXT[],
    avatar_url TEXT,
    resume_url TEXT,
    profile_completed BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Reinsert the existing data
INSERT INTO profiles (
    id, 
    full_name, 
    role, 
    bio, 
    work_email, 
    years_of_experience, 
    skills, 
    avatar_url, 
    resume_url, 
    created_at, 
    updated_at
) VALUES 
    ('3464b6a1-a28c-4cf9-9283-b5a7bc983aea', '', 'employer', null, null, null, null, null, null, '2025-04-16 11:10:06.577+00', '2025-04-16 11:10:06.577+00'),
    ('4766b28a-5005-4134-8d6a-3b1372d4a0fd', 'John Orland Ureta Sudoy ', 'job_seeker', 'hello', 'johnorlandsudoy70@gmail.com', 0, ARRAY[]::TEXT[], null, null, '2025-04-16 11:08:41.138+00', '2025-04-16 11:09:05.823+00'),
    ('9c14af99-278b-49e6-b0ad-d2e1f0d37840', 'John Orland Ureta Sudoy', 'job_seeker', null, null, null, null, '', null, '2025-04-16 11:27:06.371+00', '2025-04-16 11:27:06.371+00');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
