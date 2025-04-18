-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add is_super_admin column
ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- Create policy for admin access
CREATE POLICY "Enable read access for admins"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin' OR is_super_admin = true
  ));

-- Insert initial admin user (replace with secure password)
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  role
) VALUES (
  'admin@yourdomain.com',
  crypt('your-secure-password', gen_salt('bf')),
  now(),
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Get the user id of the admin
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@yourdomain.com';
  
  INSERT INTO profiles (
    id,
    role,
    is_super_admin,
    created_at
  ) VALUES (
    admin_user_id,
    'admin',
    true,
    now()
  ) ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        is_super_admin = true;
END $$;