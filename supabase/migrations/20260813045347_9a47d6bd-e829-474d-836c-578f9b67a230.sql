revoke execute on function public.has_role(uuid, public.app_role) from public, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;