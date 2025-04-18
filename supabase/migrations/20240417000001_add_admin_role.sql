-- Add admin role to the existing roles check constraint
ALTER TABLE profiles 
  DROP CONSTRAINT profiles_role_check,
  ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('employer', 'job_seeker', 'admin'));

-- Create admin settings table
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create admin settings policy
CREATE POLICY "Only admins can manage settings"
  ON admin_settings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );