-- Disable auto-confirmation
UPDATE auth.config
SET mailer_autoconfirm = false,
    enable_confirmations = true;