-- Live customer location used by both the mobile app and the admin dashboard.
create table if not exists public.booking_location_shares (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  started_at timestamptz,
  stopped_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_live_locations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(10,7) not null check (longitude between -180 and 180),
  accuracy_meters numeric,
  heading numeric,
  speed_mps numeric,
  altitude_meters numeric,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_location_shares_customer_enabled_idx
  on public.booking_location_shares(customer_id, enabled);

alter table public.booking_location_shares enable row level security;
alter table public.booking_live_locations enable row level security;

drop policy if exists "customers read own location shares" on public.booking_location_shares;
drop policy if exists "customers create own location shares" on public.booking_location_shares;
drop policy if exists "customers update own location shares" on public.booking_location_shares;
drop policy if exists "customers delete own location shares" on public.booking_location_shares;
drop policy if exists "admins manage location shares" on public.booking_location_shares;

create policy "customers read own location shares"
  on public.booking_location_shares for select to authenticated
  using (customer_id = auth.uid());
create policy "customers create own location shares"
  on public.booking_location_shares for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );
create policy "customers update own location shares"
  on public.booking_location_shares for update to authenticated
  using (customer_id = auth.uid())
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );
create policy "customers delete own location shares"
  on public.booking_location_shares for delete to authenticated
  using (customer_id = auth.uid());
create policy "admins manage location shares"
  on public.booking_location_shares for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers read own live locations" on public.booking_live_locations;
drop policy if exists "customers create own live locations" on public.booking_live_locations;
drop policy if exists "customers update own live locations" on public.booking_live_locations;
drop policy if exists "customers delete own live locations" on public.booking_live_locations;
drop policy if exists "admins manage live locations" on public.booking_live_locations;

create policy "customers read own live locations"
  on public.booking_live_locations for select to authenticated
  using (customer_id = auth.uid());
create policy "customers create own live locations"
  on public.booking_live_locations for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );
create policy "customers update own live locations"
  on public.booking_live_locations for update to authenticated
  using (customer_id = auth.uid())
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = auth.uid()
    )
  );
create policy "customers delete own live locations"
  on public.booking_live_locations for delete to authenticated
  using (customer_id = auth.uid());
create policy "admins manage live locations"
  on public.booking_live_locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customers upload own avatars" on storage.objects;
drop policy if exists "customers update own avatars" on storage.objects;
drop policy if exists "customers delete own avatars" on storage.objects;

create policy "customers upload own avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "customers update own avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "customers delete own avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array['booking_location_shares', 'booking_live_locations']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
