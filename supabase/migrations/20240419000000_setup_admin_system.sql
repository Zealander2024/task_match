-- Add admin role to profiles if not exists
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employer', 'job_seeker', 'admin'));

-- Add is_super_admin column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create admin-specific policies for profiles
CREATE POLICY "Admins can view all content"
ON profiles FOR SELECT
TO authenticated
USING (
  (SELECT role = 'admin' FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can modify all content"
ON profiles FOR ALL
TO authenticated
USING (
  (SELECT role = 'admin' FROM profiles WHERE id = auth.uid())
);

-- Create admin policies for job_posts
CREATE POLICY "Admins can manage all job posts"
ON job_posts FOR ALL
TO authenticated
USING (
  (SELECT role = 'admin' FROM profiles WHERE id = auth.uid())
);

-- Create admin policies for job_applications
CREATE POLICY "Admins can manage all applications"
ON job_applications FOR ALL
TO authenticated
USING (
  (SELECT role = 'admin' FROM profiles WHERE id = auth.uid())
);

-- Create function to create first admin
CREATE OR REPLACE FUNCTION create_first_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('full_name', admin_full_name)
  )
  RETURNING id INTO new_user_id;

  -- Create admin profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    is_super_admin
  ) VALUES (
    new_user_id,
    admin_full_name,
    admin_email,
    'admin',
    true
  );
END;
$$;

-- Create function to verify admin status
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- Create function for admins to create other admins
CREATE OR REPLACE FUNCTION create_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT,
  is_super BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  calling_user_is_super BOOLEAN;
BEGIN
  -- Check if the calling user is a super admin
  SELECT is_super_admin INTO calling_user_is_super
  FROM profiles
  WHERE id = auth.uid();

  IF NOT calling_user_is_super THEN
    RAISE EXCEPTION 'Only super admins can create new admins';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('full_name', admin_full_name)
  )
  RETURNING id INTO new_user_id;

  -- Create admin profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    is_super_admin
  ) VALUES (
    new_user_id,
    admin_full_name,
    admin_email,
    'admin',
    is_super
  );

  RETURN new_user_id;
END;
$$;