
-- 1. Revoke SELECT on token columns from anon/authenticated (column-level)
REVOKE SELECT (creator_browser_token) ON public.instant_trials FROM anon, authenticated;
REVOKE SELECT (browser_token)         ON public.instant_votes  FROM anon, authenticated;
REVOKE SELECT (browser_token)         ON public.players        FROM anon, authenticated;
REVOKE SELECT (host_browser_token)    ON public.rooms          FROM anon, authenticated;

-- 2. case_packs / case_templates: public read-only
DROP POLICY IF EXISTS "public insert case_packs"     ON public.case_packs;
DROP POLICY IF EXISTS "public update case_packs"     ON public.case_packs;
DROP POLICY IF EXISTS "public insert case_templates" ON public.case_templates;
DROP POLICY IF EXISTS "public update case_templates" ON public.case_templates;

-- 3. Drop UPDATE on immutable tables
DROP POLICY IF EXISTS "public update instant_votes" ON public.instant_votes;
DROP POLICY IF EXISTS "public update votes"         ON public.votes;
DROP POLICY IF EXISTS "public update verdicts"      ON public.verdicts;
DROP POLICY IF EXISTS "public update evidence"      ON public.evidence;

-- 4. Tighten instant_trials UPDATE: cannot reopen a closed trial
DROP POLICY IF EXISTS "public update instant_trials" ON public.instant_trials;
CREATE POLICY "public update instant_trials"
  ON public.instant_trials FOR UPDATE
  TO public
  USING (status <> 'closed' AND status <> 'verdict_delivered')
  WITH CHECK (true);

-- 5. Guard triggers: prevent identity/token columns from being changed via UPDATE
CREATE OR REPLACE FUNCTION public.instant_trials_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.slug <> OLD.slug
     OR NEW.creator_browser_token <> OLD.creator_browser_token
     OR NEW.accused_name <> OLD.accused_name
     OR NEW.crime_text <> OLD.crime_text
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Immutable columns cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS instant_trials_guard_trg ON public.instant_trials;
CREATE TRIGGER instant_trials_guard_trg
  BEFORE UPDATE ON public.instant_trials
  FOR EACH ROW EXECUTE FUNCTION public.instant_trials_guard();

CREATE OR REPLACE FUNCTION public.rooms_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.code <> OLD.code
     OR NEW.host_browser_token <> OLD.host_browser_token
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Immutable columns cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rooms_guard_trg ON public.rooms;
CREATE TRIGGER rooms_guard_trg BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.rooms_guard();

CREATE OR REPLACE FUNCTION public.players_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.browser_token <> OLD.browser_token
     OR NEW.room_id <> OLD.room_id
     OR NEW.joined_at <> OLD.joined_at THEN
    RAISE EXCEPTION 'Immutable columns cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS players_guard_trg ON public.players;
CREATE TRIGGER players_guard_trg BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.players_guard();

CREATE OR REPLACE FUNCTION public.rounds_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.room_id <> OLD.room_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Immutable columns cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS rounds_guard_trg ON public.rounds;
CREATE TRIGGER rounds_guard_trg BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.rounds_guard();
