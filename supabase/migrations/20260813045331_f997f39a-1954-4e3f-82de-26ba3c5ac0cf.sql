-- Role enum and user_roles table (roles must live in their own table, not profiles)
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can read own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service role can manage user roles"
  on public.user_roles for all
  to service_role
  using (true)
  with check (true);

-- Security definer helper to avoid recursive RLS when checking admin status
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Admin read policies for campus content tables
create policy "Admins can read all zones"
  on public.campus_zones for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all buildings"
  on public.campus_buildings for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all rooms"
  on public.campus_rooms for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all NPCs"
  on public.campus_npcs for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all courses"
  on public.courses for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all lessons"
  on public.lessons for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all questions"
  on public.questions for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all alley dialogue"
  on public.alley_dialogue for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Admin write policies for campus content tables
create policy "Admins can manage zones"
  on public.campus_zones for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage buildings"
  on public.campus_buildings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage rooms"
  on public.campus_rooms for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage NPCs"
  on public.campus_npcs for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage courses"
  on public.courses for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage lessons"
  on public.lessons for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage questions"
  on public.questions for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage alley dialogue"
  on public.alley_dialogue for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Admin read-only access to student progress
create policy "Admins can read all student progress"
  on public.student_progress for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));