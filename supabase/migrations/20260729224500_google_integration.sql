-- Migration: google_integration
-- Description: Table for storing user integrations (Google refresh tokens)

CREATE TABLE IF NOT EXISTS public.user_integrations (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_refresh_token TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read and write their own integrations
CREATE POLICY "Users can view their own integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC for securely upserting the Google Refresh Token
CREATE OR REPLACE FUNCTION public.set_google_refresh_token(token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_integrations (user_id, google_refresh_token, updated_at)
  VALUES (auth.uid(), token, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET google_refresh_token = EXCLUDED.google_refresh_token,
      updated_at = EXCLUDED.updated_at;
END;
$$;
