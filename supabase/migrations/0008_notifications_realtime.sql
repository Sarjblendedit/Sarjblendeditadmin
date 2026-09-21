-- The mobile client listens for booking notifications over Supabase Realtime.
do $$
begin
  if to_regclass('public.notifications') is not null
    and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
