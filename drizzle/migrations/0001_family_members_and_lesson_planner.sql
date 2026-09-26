ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_email text;
UPDATE public.profiles p SET login_email = u.email FROM auth.users u WHERE u.id = p.id AND p.login_email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_family_role text := new.raw_user_meta_data ->> 'family_role';
  v_family_code text := new.raw_user_meta_data ->> 'family_code';
  v_family_name text := new.raw_user_meta_data ->> 'family_name';
  v_family_id uuid;
begin
  if v_family_role not in ('parent','student') then
    v_family_role := null;
  end if;

  if v_family_code is not null then
    select id into v_family_id from public.families where family_code = upper(v_family_code);
    if v_family_id is null then
      raise exception 'Invalid family code';
    end if;
  elsif v_family_role = 'parent' then
    insert into public.families (family_name)
    values (coalesce(v_family_name, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)) || '''s Family'))
    returning id into v_family_id;
  end if;

  insert into public.profiles (id, display_name, family_id, family_role, login_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1), 'Student'),
    v_family_id,
    v_family_role,
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.is_family_parent()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  select exists (select 1 from public.profiles where id = auth.uid() and family_role = 'parent' and family_id is not null)
$$;
GRANT EXECUTE ON FUNCTION private.is_family_parent() TO authenticated;

CREATE OR REPLACE FUNCTION private.in_my_family(_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  select exists (select 1 from public.profiles where id = _user and family_id = private.current_family_id())
$$;
GRANT EXECUTE ON FUNCTION private.in_my_family(uuid) TO authenticated;

CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  lesson_id text NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_plans_student_idx ON public.lesson_plans (student_id, scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student reads own plans" ON public.lesson_plans FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "parents read family plans" ON public.lesson_plans FOR SELECT TO authenticated
  USING (family_id = private.current_family_id() AND private.is_family_parent());
CREATE POLICY "parents add family plans" ON public.lesson_plans FOR INSERT TO authenticated
  WITH CHECK (family_id = private.current_family_id() AND private.is_family_parent() AND private.in_my_family(student_id));
CREATE POLICY "parents edit family plans" ON public.lesson_plans FOR UPDATE TO authenticated
  USING (family_id = private.current_family_id() AND private.is_family_parent())
  WITH CHECK (family_id = private.current_family_id() AND private.is_family_parent() AND private.in_my_family(student_id));
CREATE POLICY "parents remove family plans" ON public.lesson_plans FOR DELETE TO authenticated
  USING (family_id = private.current_family_id() AND private.is_family_parent());