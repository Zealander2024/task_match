-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add is_super_admin column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create policy for admin access
CREATE POLICY "Enable read access for admins"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin' OR is_super_admin = true
  ));

-- Insert initial admin user (with secure handling)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- First try to get existing admin user
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@taskmah.com';
  
  -- If admin doesn't exist, create new admin user
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      role,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      'admin@taskmah.com',
      crypt('adminTaskmatch2024', gen_salt('bf')),
      now(),
      'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "admin"}'
    )
    RETURNING id INTO admin_user_id;
  END IF;

  -- Insert or update profile
  INSERT INTO profiles (
    id,
    role,
    is_super_admin,
    created_at,
    full_name
  ) VALUES (
    admin_user_id,
    'admin',
    true,
    now(),
    'Admin User'
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        is_super_admin = true,
        updated_at = now();

END $$;

-- Verify admin was created
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM profiles 
    WHERE role = 'admin' 
    AND is_super_admin = true
  ), 'Admin user was not created successfully';
END $$;
