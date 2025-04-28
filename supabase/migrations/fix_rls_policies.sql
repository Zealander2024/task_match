-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
-- Allow users to view profiles (you can restrict this further if needed)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
    ON profiles FOR DELETE
    USING (auth.uid() = id);