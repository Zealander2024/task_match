-- Add profile_completion_percentage column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;