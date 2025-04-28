-- First, disable RLS to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users on their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users on their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
-- SELECT: Allow authenticated users to view all profiles
CREATE POLICY "profiles_select_all"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Allow authenticated users to insert their own profile
CREATE POLICY "profiles_insert_self"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: Allow users to update their own profile
CREATE POLICY "profiles_update_self"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- DELETE: Allow users to delete their own profile
CREATE POLICY "profiles_delete_self"
    ON profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON profiles TO authenticated;

-- Verify the table owner and permissions
ALTER TABLE profiles OWNER TO postgres;