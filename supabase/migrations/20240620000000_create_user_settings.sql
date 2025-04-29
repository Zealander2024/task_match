-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_notifications BOOLEAN DEFAULT TRUE,
  application_updates BOOLEAN DEFAULT TRUE,
  message_notifications BOOLEAN DEFAULT TRUE,
  profile_privacy TEXT DEFAULT 'public' CHECK (profile_privacy IN ('public', 'limited', 'private')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can read only their own settings
CREATE POLICY "Users can read their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update only their own settings
CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert only their own settings
CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all user settings
CREATE POLICY "Admins can read all user settings"
  ON user_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_timestamp
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_updated_at(); 