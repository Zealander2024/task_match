-- Create an enum for user roles if it doesn't exist
CREATE TYPE user_role AS ENUM ('user', 'admin', 'employer', 'job_seeker');

-- Alter the profiles table to use the new type
ALTER TABLE profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;