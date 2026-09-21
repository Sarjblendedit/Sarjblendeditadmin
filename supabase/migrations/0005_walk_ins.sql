create table if not exists public.walk_in_customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.walk_in_visits (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.walk_in_customers(id) on delete cascade,
  service_id uuid references public.services(id),
  service_name text not null,
  amount numeric(10,2) not null default 0 check(amount >= 0),
  payment_method public.payment_method not null default 'cash',
  status public.booking_status not null default 'completed',
  notes text,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists walk_in_visits_date_idx on public.walk_in_visits(visited_at desc);

alter table public.walk_in_customers enable row level security;
alter table public.walk_in_visits enable row level security;
create policy "admins manage walk in customers" on public.walk_in_customers for all using(public.is_admin()) with check(public.is_admin());
create policy "admins manage walk in visits" on public.walk_in_visits for all using(public.is_admin()) with check(public.is_admin());

alter publication supabase_realtime add table public.walk_in_customers;
alter publication supabase_realtime add table public.walk_in_visits;
