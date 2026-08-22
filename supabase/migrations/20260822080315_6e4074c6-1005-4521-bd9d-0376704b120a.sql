
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

CREATE OR REPLACE FUNCTION private.current_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select family_id from public.profiles where id = auth.uid()
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_family_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_family_id() TO authenticated, service_role;

-- Repoint every policy that used the publicly callable helpers.
DROP POLICY IF EXISTS "Admins can read all zones" ON public.campus_zones;
CREATE POLICY "Admins can read all zones" ON public.campus_zones FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage zones" ON public.campus_zones;
CREATE POLICY "Admins can manage zones" ON public.campus_zones FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all buildings" ON public.campus_buildings;
CREATE POLICY "Admins can read all buildings" ON public.campus_buildings FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage buildings" ON public.campus_buildings;
CREATE POLICY "Admins can manage buildings" ON public.campus_buildings FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all rooms" ON public.campus_rooms;
CREATE POLICY "Admins can read all rooms" ON public.campus_rooms FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.campus_rooms;
CREATE POLICY "Admins can manage rooms" ON public.campus_rooms FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all NPCs" ON public.campus_npcs;
CREATE POLICY "Admins can read all NPCs" ON public.campus_npcs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage NPCs" ON public.campus_npcs;
CREATE POLICY "Admins can manage NPCs" ON public.campus_npcs FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all courses" ON public.courses;
CREATE POLICY "Admins can read all courses" ON public.courses FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all lessons" ON public.lessons;
CREATE POLICY "Admins can read all lessons" ON public.lessons FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all questions" ON public.questions;
CREATE POLICY "Admins can read all questions" ON public.questions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all alley dialogue" ON public.alley_dialogue;
CREATE POLICY "Admins can read all alley dialogue" ON public.alley_dialogue FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage alley dialogue" ON public.alley_dialogue;
CREATE POLICY "Admins can manage alley dialogue" ON public.alley_dialogue FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all student progress" ON public.student_progress;
CREATE POLICY "Admins can read all student progress" ON public.student_progress FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "family members read own family" ON public.families;
CREATE POLICY "family members read own family" ON public.families FOR SELECT TO authenticated USING (id = private.current_family_id());
DROP POLICY IF EXISTS "family members update own family" ON public.families;
CREATE POLICY "family members update own family" ON public.families FOR UPDATE TO authenticated USING (id = private.current_family_id()) WITH CHECK (id = private.current_family_id());

DROP POLICY IF EXISTS "parent reads family profiles" ON public.profiles;
CREATE POLICY "parent reads family profiles" ON public.profiles FOR SELECT TO authenticated USING (family_id = private.current_family_id());

DROP POLICY IF EXISTS "parent reads family student progress" ON public.student_progress;
CREATE POLICY "parent reads family student progress" ON public.student_progress FOR SELECT TO authenticated USING (exists (select 1 from public.profiles p where p.id = student_progress.user_id and p.family_id = private.current_family_id()));

DROP POLICY IF EXISTS "parent reads family objectives" ON public.campus_objectives;
CREATE POLICY "parent reads family objectives" ON public.campus_objectives FOR SELECT TO authenticated USING (exists (select 1 from public.profiles p where p.id = campus_objectives.user_id and p.family_id = private.current_family_id()));

DROP POLICY IF EXISTS "parent reads family discoveries" ON public.student_campus_discoveries;
CREATE POLICY "parent reads family discoveries" ON public.student_campus_discoveries FOR SELECT TO authenticated USING (exists (select 1 from public.profiles p where p.id = student_campus_discoveries.user_id and p.family_id = private.current_family_id()));

-- The admin PIN check now uses the private helper too.
CREATE OR REPLACE FUNCTION public.verify_admin_pin(_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not private.has_role(auth.uid(), 'admin') then
    return false;
  end if;
  return exists (
    select 1 from public.admin_pins
    where user_id = auth.uid() and pin_hash = crypt(_pin, pin_hash)
  );
end;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.current_family_id();
