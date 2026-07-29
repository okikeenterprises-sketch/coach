-- Migration: manage_users
-- Description: Add RPC functions for user management

-- Function to list all profiles
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$;

-- Function to toggle admin status
CREATE OR REPLACE FUNCTION public.toggle_admin_status(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status boolean;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  -- Cannot toggle yourself to prevent accidental lockout
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot toggle your own admin status';
  END IF;

  -- Toggle the status
  UPDATE public.profiles
  SET is_admin = NOT is_admin
  WHERE id = target_user_id
  RETURNING is_admin INTO new_status;

  RETURN new_status;
END;
$$;
