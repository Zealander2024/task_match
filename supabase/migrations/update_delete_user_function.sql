-- Update the delete_user function to check admin email instead of role
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is the admin by email
  IF NOT (SELECT email = 'admin@tamaskmah.com' FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Only administrators can delete users.';
  END IF;

  -- Delete the user from auth.users (this will cascade to profiles due to FK)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;