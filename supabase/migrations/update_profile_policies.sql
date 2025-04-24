-- First, drop current policy names
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Then drop all other possible existing policies
DROP POLICY IF EXISTS "Enable read access for users and admins" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users and admins" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users and admins" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for self" ON profiles;
DROP POLICY IF EXISTS "Enable update for self" ON profiles;
DROP POLICY IF EXISTS "Enable delete for self" ON profiles;
DROP POLICY IF EXISTS "Admins can view all content" ON profiles;
DROP POLICY IF EXISTS "Admins can modify all content" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "profiles_read_policy"
ON profiles FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = id
);

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING (
  auth.role() = 'authenticated' AND (
    auth.uid() = id
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
);

CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
USING (
  auth.role() = 'authenticated' AND (
    auth.uid() = id
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
);

