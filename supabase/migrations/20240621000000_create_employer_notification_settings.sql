-- Create employer_notification_settings table
CREATE TABLE IF NOT EXISTS employer_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "newApplications": true,
    "candidateMessages": true,
    "jobAlerts": true,
    "marketingEmails": false
  }',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT employer_notification_settings_employer_id_key UNIQUE (employer_id)
);

-- Enable RLS
ALTER TABLE employer_notification_settings ENABLE ROW LEVEL SECURITY;

-- Add policies
-- Employers can read their own settings
CREATE POLICY "Employers can read their own settings"
  ON employer_notification_settings FOR SELECT
  USING (auth.uid() = employer_id);

-- Employers can insert their own settings
CREATE POLICY "Employers can insert their own settings"
  ON employer_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Employers can update their own settings
CREATE POLICY "Employers can update their own settings"
  ON employer_notification_settings FOR UPDATE
  USING (auth.uid() = employer_id);

-- Admins can read all settings
CREATE POLICY "Admins can read all notification settings"
  ON employer_notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_employer_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employer_notification_settings_timestamp
BEFORE UPDATE ON employer_notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_employer_notification_settings_updated_at(); 