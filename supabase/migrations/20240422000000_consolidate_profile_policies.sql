-- First, drop ALL existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable delete for own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for self" ON profiles;
DROP POLICY IF EXISTS "Enable update for self" ON profiles;
DROP POLICY IF EXISTS "Enable delete for self" ON profiles;

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create fresh policies with unique names
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);