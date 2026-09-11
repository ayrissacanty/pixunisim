CREATE TABLE public.student_quests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id text NOT NULL,
  status text NOT NULL DEFAULT 'accepted',
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_quests TO authenticated;
GRANT ALL ON public.student_quests TO service_role;
ALTER TABLE public.student_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own quests" ON public.student_quests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent reads family quests" ON public.student_quests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = student_quests.user_id
      AND p.family_id = private.current_family_id()
  ));

CREATE TRIGGER update_student_quests_updated_at
  BEFORE UPDATE ON public.student_quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'lesson',
  used_count integer NOT NULL DEFAULT 0,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_inventory TO authenticated;
GRANT ALL ON public.student_inventory TO service_role;
ALTER TABLE public.student_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own inventory" ON public.student_inventory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent reads family inventory" ON public.student_inventory
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = student_inventory.user_id
      AND p.family_id = private.current_family_id()
  ));

CREATE TRIGGER update_student_inventory_updated_at
  BEFORE UPDATE ON public.student_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();