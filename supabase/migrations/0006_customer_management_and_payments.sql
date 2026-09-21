alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists residence text,
  add column if not exists customer_type text not null default 'app' check (customer_type in ('app','walk_in')),
  add column if not exists is_blocked boolean not null default false;

alter table public.bookings
  add column if not exists amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  add column if not exists payment_checked_at timestamptz,
  add column if not exists payment_checked_by uuid references public.profiles(id);

create or replace function public.require_payment_before_completion()
returns trigger language plpgsql security definer set search_path=public as $$
declare required_amount numeric;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    required_amount := coalesce(new.quoted_price, (select base_price from public.services where id=new.service_id), 0);
    if coalesce(new.amount_paid,0) < required_amount then
      raise exception 'Payment is incomplete: K% paid, K% required.', coalesce(new.amount_paid,0), required_amount;
    end if;
    new.payment_status := 'paid';
    new.payment_checked_at := now();
    new.payment_checked_by := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_completion_payment on public.bookings;
create trigger enforce_completion_payment
before update of status,amount_paid on public.bookings
for each row execute procedure public.require_payment_before_completion();

drop policy if exists "admins create profiles" on public.profiles;
create policy "admins create profiles" on public.profiles for insert with check(public.is_admin());
create policy "admins update profiles" on public.profiles for update using(public.is_admin()) with check(public.is_admin());

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text,
  phone text,
  email text,
  residence text,
  customer_type text not null default 'walk_in' check (customer_type in ('app','walk_in')),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create policy "admins manage customers" on public.customers for all using(public.is_admin()) with check(public.is_admin());
create trigger update_customers_timestamp before update on public.customers for each row execute procedure public.set_updated_at();
