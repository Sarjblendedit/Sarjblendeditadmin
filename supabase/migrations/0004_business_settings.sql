create table if not exists public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'SARJ BLENDED IT',
  tagline text,
  logo_url text,
  contact_phone text,
  contact_email text,
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id, business_name, tagline)
values (true, 'SARJ BLENDED IT', 'Premium mobile barber')
on conflict (id) do nothing;

alter table public.business_settings enable row level security;
create policy "business settings public readable"
  on public.business_settings for select using (true);
create policy "admins manage business settings"
  on public.business_settings for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.set_business_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists update_business_settings_timestamp on public.business_settings;
create trigger update_business_settings_timestamp
before update on public.business_settings
for each row execute procedure public.set_business_settings_updated_at();
