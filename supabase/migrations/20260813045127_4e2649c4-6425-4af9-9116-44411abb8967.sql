ALTER TABLE public.campus_zones
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS grade_band text NOT NULL DEFAULT '6-12',
  ADD COLUMN IF NOT EXISTS map_asset_url text;

ALTER TABLE public.campus_buildings
  ADD COLUMN IF NOT EXISTS interior_map_asset_url text,
  ADD COLUMN IF NOT EXISTS entrance_position jsonb;

ALTER TABLE public.campus_rooms
  ADD COLUMN IF NOT EXISTS door_position jsonb,
  ADD COLUMN IF NOT EXISTS faculty_character text NOT NULL DEFAULT 'alley';

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS grade integer,
  ADD COLUMN IF NOT EXISTS standard_code text,
  ADD COLUMN IF NOT EXISTS render_config jsonb,
  ADD COLUMN IF NOT EXISTS curriculum_source text NOT NULL DEFAULT 'unify_tier1';

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS last_position jsonb,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.alley_dialogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text REFERENCES public.campus_rooms(id) ON DELETE CASCADE,
  trigger_context text NOT NULL CHECK (trigger_context IN ('lesson_start','lesson_resume','completion')),
  grade_band text NOT NULL DEFAULT '6-12',
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.alley_dialogue TO anon;
GRANT SELECT ON public.alley_dialogue TO authenticated;
GRANT ALL ON public.alley_dialogue TO service_role;

ALTER TABLE public.alley_dialogue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read alley dialogue"
  ON public.alley_dialogue FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_alley_dialogue_updated_at
  BEFORE UPDATE ON public.alley_dialogue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();