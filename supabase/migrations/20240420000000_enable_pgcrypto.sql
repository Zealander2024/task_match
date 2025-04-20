-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_first_admin;

-- Enable pgcrypto in both public and auth schemas
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA auth;

-- Create the function with explicit schema references
CREATE OR REPLACE FUNCTION create_first_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_full_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users with explicit schema references
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmed_at
  ) VALUES (
    admin_email,
    auth.crypt(admin_password, auth.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', admin_full_name),
    now(),
    now(),
    now()
  )
  RETURNING id INTO new_user_id;

  -- Create admin profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    admin_full_name,
    admin_email,
    'admin',
    true,
    now(),
    now()
  );
END;
$$;
