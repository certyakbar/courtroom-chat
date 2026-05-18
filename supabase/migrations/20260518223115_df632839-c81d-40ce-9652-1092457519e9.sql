
CREATE TABLE public.instant_jurors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trial_id uuid NOT NULL REFERENCES public.instant_trials(id) ON DELETE CASCADE,
  browser_token text NOT NULL,
  nickname text NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (trial_id, browser_token)
);

CREATE INDEX idx_instant_jurors_trial_id ON public.instant_jurors(trial_id);

ALTER TABLE public.instant_jurors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read instant_jurors"
  ON public.instant_jurors FOR SELECT
  USING (true);

CREATE POLICY "public insert instant_jurors"
  ON public.instant_jurors FOR INSERT
  WITH CHECK (true);
