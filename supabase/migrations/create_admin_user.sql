-- First, create the admin user in auth.users if it doesn't exist
INSERT INTO auth.users (
  instance_id,
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmed_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'admin@tamaskmah.com',
  crypt('aminTaskmatch2024d', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"admin":true}',
  false,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@tamaskmah.com'
);

-- Then, ensure the admin user exists in the profiles table
INSERT INTO public.profiles (
  id,
  full_name,
  role,
  email,
  created_at,
  updated_at
)
SELECT
  id,
  'Admin',
  'admin',
  email,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'admin@tamaskmah.com'
ON CONFLICT (id) DO NOTHING;