create or replace function public.create_family(_family_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _code text;
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(_family_name), '') = '' then
    raise exception 'family name required';
  end if;

  loop
    _code := public.generate_family_code();
    exit when not exists (select 1 from public.families f where f.family_code = _code);
  end loop;

  insert into public.families (family_name, family_code)
  values (trim(_family_name), _code)
  returning id into _id;

  update public.profiles
     set family_id = _id,
         family_role = 'parent'
   where id = auth.uid();

  return _code;
end;
$$;

create or replace function public.join_family(_family_code text, _role text default 'student')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select f.id into _id
    from public.families f
   where upper(f.family_code) = upper(trim(_family_code));

  if _id is null then
    raise exception 'no family found for that code';
  end if;

  update public.profiles
     set family_id = _id,
         family_role = case when _role = 'parent' then 'parent' else 'student' end
   where id = auth.uid();

  return _id;
end;
$$;

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.join_family(text, text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;