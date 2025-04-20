-- Update auth settings to require email confirmation
UPDATE auth.config
SET value = 'false'
WHERE key = 'mailer_autoconfirm';

UPDATE auth.config
SET value = 'true'
WHERE key = 'enable_confirmations';

-- Set confirmation template
UPDATE auth.config
SET value = jsonb_build_object(
  'subject', 'Confirm your email address',
  'content_path', 'email/confirmation',
  'redirect_to', '/auth/callback',
  'redirect_base_url', '#{BASE_URL}'
)
WHERE key = 'mailer_templates';

-- Ensure existing unconfirmed users require confirmation
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email_confirmed_at IS NOT NULL
  AND confirmed_at IS NULL;

-- Verify the settings (optional)
SELECT key, value FROM auth.config 
WHERE key IN ('mailer_autoconfirm', 'enable_confirmations');


