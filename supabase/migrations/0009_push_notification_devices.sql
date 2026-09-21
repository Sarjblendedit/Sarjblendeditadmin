create table if not exists public.push_notification_devices (
  expo_push_token text primary key,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists push_notification_devices_customer_idx
  on public.push_notification_devices(customer_id);

alter table public.push_notification_devices enable row level security;

drop policy if exists "customers manage own push devices" on public.push_notification_devices;
create policy "customers manage own push devices"
  on public.push_notification_devices for all to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop trigger if exists update_push_notification_devices_timestamp on public.push_notification_devices;
create trigger update_push_notification_devices_timestamp
before update on public.push_notification_devices
for each row execute procedure public.set_updated_at();
