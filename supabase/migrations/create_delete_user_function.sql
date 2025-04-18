-- Create a function to delete users (requires admin access)
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user has admin role
  IF NOT (SELECT auth.jwt() ->> 'role' = 'admin') THEN
    RAISE EXCEPTION 'Access denied. Only administrators can delete users.';
  END IF;

  -- Delete the user from auth.users (this will cascade to profiles due to FK)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;