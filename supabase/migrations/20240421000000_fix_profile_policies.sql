-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable delete for own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies with proper UPDATE permissions
CREATE POLICY "Enable read access for all authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for own profile"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

