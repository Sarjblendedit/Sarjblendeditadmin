create table if not exists public.customer_admin_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null check (char_length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists customer_admin_messages_customer_created_idx
  on public.customer_admin_messages(customer_id, created_at);

alter table public.customer_admin_messages enable row level security;

create policy "customers read own support messages"
  on public.customer_admin_messages for select to authenticated
  using (customer_id = auth.uid());

create policy "customers send support messages"
  on public.customer_admin_messages for insert to authenticated
  with check (customer_id = auth.uid() and sender = 'customer');

create policy "admins manage support messages"
  on public.customer_admin_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.customer_admin_messages;
