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