-- Persistent customer preferences and reusable service locations.
create table if not exists public.customer_preferences (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  booking_updates boolean not null default true,
  appointment_reminders boolean not null default true,
  marketing boolean not null default false,
  language text not null default 'English',
  payment_preference public.payment_method not null default 'cash',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_preferences enable row level security;

create policy "customers manage own preferences"
  on public.customer_preferences for all to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "admins read customer preferences"
  on public.customer_preferences for select to authenticated
  using (public.is_admin());

drop trigger if exists update_customer_preferences_timestamp on public.customer_preferences;
create trigger update_customer_preferences_timestamp
before update on public.customer_preferences
for each row execute procedure public.set_updated_at();

create table if not exists public.customer_saved_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_saved_addresses_customer_idx
  on public.customer_saved_addresses(customer_id, is_default desc, created_at desc);

alter table public.customer_saved_addresses enable row level security;

create policy "customers manage own saved addresses"
  on public.customer_saved_addresses for all to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "admins read saved addresses"
  on public.customer_saved_addresses for select to authenticated
  using (public.is_admin());

drop trigger if exists update_customer_saved_addresses_timestamp on public.customer_saved_addresses;
create trigger update_customer_saved_addresses_timestamp
before update on public.customer_saved_addresses
for each row execute procedure public.set_updated_at();
