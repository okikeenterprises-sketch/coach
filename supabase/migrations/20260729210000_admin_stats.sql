-- 1. Add is_admin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activity insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own activity select" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Admin policy
CREATE POLICY "admin activity select" ON public.activity_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 3. Create get_admin_stats() RPC
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _total_users INT;
  _new_users_7d INT;
  _total_tasks INT;
  _completed_tasks INT;
  _total_chat_messages INT;
  _recent_users JSONB;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO _is_admin FROM public.profiles WHERE id = auth.uid();
  IF _is_admin IS NOT true THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Gather stats
  SELECT COUNT(*) INTO _total_users FROM public.profiles;
  SELECT COUNT(*) INTO _new_users_7d FROM public.profiles WHERE created_at > now() - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO _total_tasks FROM public.tasks;
  SELECT COUNT(*) INTO _completed_tasks FROM public.tasks WHERE status = 'done';

  SELECT COUNT(*) INTO _total_chat_messages FROM public.chat_messages;

  -- Get recent users
  SELECT jsonb_agg(row_to_json(r)) INTO _recent_users FROM (
    SELECT id, display_name, created_at, email_enabled, is_admin
    FROM public.profiles
    ORDER BY created_at DESC
    LIMIT 10
  ) r;

  RETURN jsonb_build_object(
    'total_users', _total_users,
    'new_users_7d', _new_users_7d,
    'total_tasks', _total_tasks,
    'completed_tasks', _completed_tasks,
    'total_chat_messages', _total_chat_messages,
    'recent_users', COALESCE(_recent_users, '[]'::jsonb)
  );
END;
$$;
