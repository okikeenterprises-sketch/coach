-- habits
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits all" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- habit logs
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit logs all" ON public.habit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX habit_logs_user_date_idx ON public.habit_logs(user_id, completed_date);

CREATE TRIGGER habits_touch BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
