-- Create function to ensure job seeker profile exists
CREATE OR REPLACE FUNCTION public.ensure_job_seeker_profile(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.job_seekers WHERE id = user_id) THEN
    -- Get user data
    WITH user_data AS (
      SELECT id, email, raw_user_meta_data->>'full_name' as full_name
      FROM auth.users
      WHERE id = user_id
    )
    -- Insert profile if it doesn't exist
    INSERT INTO public.job_seekers (id, full_name, email)
    SELECT id, COALESCE(full_name, ''), email
    FROM user_data;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 