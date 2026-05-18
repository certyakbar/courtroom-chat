
-- Instant Trials
CREATE TABLE public.instant_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  accused_name text NOT NULL,
  crime_text text NOT NULL,
  suggested_sentence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  result text,
  verdict_sentence text,
  best_evidence_id uuid,
  creator_browser_token text NOT NULL
);

CREATE TABLE public.instant_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.instant_trials(id) ON DELETE CASCADE,
  voter_nickname text NOT NULL,
  browser_token text NOT NULL,
  vote text NOT NULL,
  evidence_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trial_id, browser_token)
);

-- Party Court
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text,
  host_browser_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  current_round_id uuid
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  avatar text NOT NULL,
  browser_token text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, browser_token)
);

CREATE TABLE public.case_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name text NOT NULL,
  category text
);

CREATE TABLE public.case_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.case_packs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  suggested_sentence text
);

CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  case_type text NOT NULL,
  case_template_id uuid REFERENCES public.case_templates(id),
  accused_player_id uuid REFERENCES public.players(id),
  custom_title text,
  custom_description text,
  suggested_sentence text,
  chaos_lawyer_player_id uuid REFERENCES public.players(id),
  phase text NOT NULL DEFAULT 'intro',
  created_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz
);

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  vote text NOT NULL,
  chaos_guess_player_id uuid REFERENCES public.players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

CREATE TABLE public.verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  instant_trial_id uuid REFERENCES public.instant_trials(id) ON DELETE CASCADE,
  result text NOT NULL,
  sentence text,
  best_evidence_id uuid,
  chaos_lawyer_found boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS, allow public read+insert (link-based access, no auth in MVP)
ALTER TABLE public.instant_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verdicts ENABLE ROW LEVEL SECURITY;

-- Public read & insert for all gameplay tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['instant_trials','instant_votes','rooms','players','case_packs','case_templates','rounds','evidence','votes','verdicts']) LOOP
    EXECUTE format('CREATE POLICY "public read %1$I" ON public.%1$I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "public insert %1$I" ON public.%1$I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "public update %1$I" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Seed case packs and templates
WITH p1 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 1: Group Chat Crimes','chat') RETURNING id),
     p2 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 2: Food Court','food') RETURNING id),
     p3 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 3: Housemate Trials','housemate') RETURNING id),
     p4 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 4: Relationship Court','relationship') RETURNING id),
     p5 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 5: Family Dinner Court','family') RETURNING id),
     p6 AS (INSERT INTO public.case_packs (season_name, category) VALUES ('Season 6: Money & Splitting Bills','money') RETURNING id)
INSERT INTO public.case_templates (pack_id, title, description, suggested_sentence)
SELECT (SELECT id FROM p1), 'The 5 Minute Lie', 'He said he was 5 minutes away but was still in bed.', 'Must arrive 30 minutes early for the next 3 plans.'
UNION ALL SELECT (SELECT id FROM p1), 'The Ignored Message', 'They opened the message, ignored it, then said they were busy.', 'Banned from using "sorry just seeing this" for one month.'
UNION ALL SELECT (SELECT id FROM p1), 'The Lol Reply', 'They replied "lol" to a heartfelt message.', 'Must send one voice note of genuine emotion.'
UNION ALL SELECT (SELECT id FROM p1), 'The Voice Note Crime', 'They sent a voice note longer than a podcast episode.', 'Limited to 15-second voice notes for 2 weeks.'
UNION ALL SELECT (SELECT id FROM p1), 'The Ghost Group Chat', 'They left the group chat then asked what happened.', 'Must read every unread message out loud.'
UNION ALL SELECT (SELECT id FROM p2), 'The Last Slice', 'Someone ate the last slice and called it legally abandoned.', 'Buys the next pizza in full.'
UNION ALL SELECT (SELECT id FROM p2), 'The Diet Defector', 'They said they were on a diet, then finished everyone''s chips.', 'Banned from saying the word "diet" for 30 days.'
UNION ALL SELECT (SELECT id FROM p2), 'The Water Critic', 'They ordered water then judged everyone''s food.', 'Must order the most expensive dish next time.'
UNION ALL SELECT (SELECT id FROM p2), 'The Not Hungry Hoax', 'They said they were not hungry then ate half the chips.', 'No chip privileges for two outings.'
UNION ALL SELECT (SELECT id FROM p3), 'The Milk Crime', 'Someone left one spoonful of milk in the bottle and put it back.', 'Buys milk for the entire month.'
UNION ALL SELECT (SELECT id FROM p3), 'The Soaking Dishes', 'They left the dishes to soak for 3 business days.', 'On dish duty for one week.'
UNION ALL SELECT (SELECT id FROM p3), 'The Charger Heist', 'They borrowed a charger and started treating it like inheritance.', 'Must return the charger within 24 hours, gift-wrapped.'
UNION ALL SELECT (SELECT id FROM p3), 'The Community Charger', 'They kept the charger and called it community property.', 'Buys everyone a new cable.'
UNION ALL SELECT (SELECT id FROM p4), 'The Episode Betrayer', 'They watched the next episode without the group.', 'Must rewatch with the group and pretend to be surprised.'
UNION ALL SELECT (SELECT id FROM p4), 'The Sock Wait', 'They said "I''m ready" while still looking for socks.', 'Must be fully dressed 15 minutes before next plan.'
UNION ALL SELECT (SELECT id FROM p4), 'The Vague Plan', 'They said "we should all meet up soon" and organised nothing.', 'Must plan and pay for the next group hangout.'
UNION ALL SELECT (SELECT id FROM p5), 'The Aux Hijack', 'They asked for aux and played one song then got distracted.', 'Aux privileges revoked indefinitely.'
UNION ALL SELECT (SELECT id FROM p5), 'The Bedroom Traffic', 'They turned up late and blamed traffic from their bedroom.', 'Must arrive first for the next 5 events.'
UNION ALL SELECT (SELECT id FROM p6), 'The Equal Split Scam', 'They suggested splitting the bill equally after ordering the most expensive thing.', 'Must Venmo everyone the difference, with interest.'
UNION ALL SELECT (SELECT id FROM p6), 'The Saving Money Lie', 'They said they were saving money then bought nonsense.', 'Cash-only for one full month.';
