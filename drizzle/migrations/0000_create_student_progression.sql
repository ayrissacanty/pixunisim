CREATE TABLE public.student_progression (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  coins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_progression TO authenticated;
GRANT ALL ON public.student_progression TO service_role;

ALTER TABLE public.student_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progression" ON public.student_progression
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent reads family progression" ON public.student_progression
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = student_progression.user_id AND p.family_id = private.current_family_id()
  ));

CREATE TRIGGER update_student_progression_updated_at
  BEFORE UPDATE ON public.student_progression
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_awards_user_created_idx ON public.student_awards (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_awards TO authenticated;
GRANT ALL ON public.student_awards TO service_role;

ALTER TABLE public.student_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own awards" ON public.student_awards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent reads family awards" ON public.student_awards
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = student_awards.user_id AND p.family_id = private.current_family_id()
  ));
