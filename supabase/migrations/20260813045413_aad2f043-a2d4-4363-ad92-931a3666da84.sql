revoke execute on function public.has_role(uuid, public.app_role) from anon, public, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;