ALTER TABLE public.instant_trials
  ADD COLUMN IF NOT EXISTS discord_channel_id text,
  ADD COLUMN IF NOT EXISTS discord_message_id text,
  ADD COLUMN IF NOT EXISTS discord_guild_id text,
  ADD COLUMN IF NOT EXISTS hide_counts boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS instant_trials_discord_message_id_idx
  ON public.instant_trials (discord_message_id);