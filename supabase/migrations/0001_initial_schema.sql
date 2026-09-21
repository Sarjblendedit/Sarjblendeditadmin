create extension if not exists "uuid-ossp";

create type public.booking_status as enum ('received','confirmed','on_the_way','arrived','in_progress','completed','cancelled','rejected');
create type public.payment_method as enum ('cash','airtel_money','mtn_momo','zamtel_kwacha','card');
create type public.payment_status as enum ('pending','paid','failed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, avatar_url text, role text not null default 'customer' check (role in ('customer','admin','barber')),
  created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default uuid_generate_v4(), name text not null unique, description text,
  base_price numeric(10,2) not null check (base_price >= 0), duration_minutes integer default 45,
  is_active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.bookings (
  id uuid primary key default uuid_generate_v4(), customer_id uuid not null references public.profiles(id),
  service_id uuid not null references public.services(id), scheduled_at timestamptz not null,
  address text not null, latitude numeric(10,7), longitude numeric(10,7), notes text, inspiration_image_url text,
  status public.booking_status not null default 'received', payment_method public.payment_method not null default 'cash',
  payment_status public.payment_status not null default 'pending', quoted_price numeric(10,2), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index bookings_schedule_idx on public.bookings(scheduled_at);
create index bookings_customer_idx on public.bookings(customer_id);
create table public.booking_status_history (id uuid primary key default uuid_generate_v4(), booking_id uuid not null references public.bookings(id) on delete cascade, status public.booking_status not null, note text, created_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table public.reviews (id uuid primary key default uuid_generate_v4(), booking_id uuid unique references public.bookings(id), customer_id uuid not null references public.profiles(id), rating integer not null check (rating between 1 and 5), comment text, image_url text, reply text, created_at timestamptz not null default now());
create table public.gallery_items (id uuid primary key default uuid_generate_v4(), title text, media_url text not null, media_type text not null check(media_type in ('image','video')), category text, is_published boolean default true, created_at timestamptz not null default now());
create table public.promotions (id uuid primary key default uuid_generate_v4(), title text not null, code text unique, description text, discount_percent numeric(5,2), starts_at timestamptz, ends_at timestamptz, is_active boolean default true);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id,full_name,phone) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.phone); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.prevent_double_booking() returns trigger language plpgsql security definer set search_path = public as $$ begin if exists(select 1 from public.bookings where scheduled_at=new.scheduled_at and status not in ('cancelled','rejected') and id is distinct from new.id) then raise exception 'This appointment time is no longer available'; end if; return new; end; $$;
create trigger enforce_available_time before insert or update of scheduled_at,status on public.bookings for each row execute procedure public.prevent_double_booking();
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger update_booking_timestamp before update on public.bookings for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security; alter table public.services enable row level security; alter table public.bookings enable row level security; alter table public.booking_status_history enable row level security; alter table public.reviews enable row level security; alter table public.gallery_items enable row level security; alter table public.promotions enable row level security;
create policy "profile readable by owner or admin" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "profile editable by owner" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "services publicly readable" on public.services for select using (is_active=true or public.is_admin()); create policy "admins manage services" on public.services for all using (public.is_admin()) with check(public.is_admin());
create policy "customers see own bookings" on public.bookings for select using(customer_id=auth.uid() or public.is_admin()); create policy "customers create own bookings" on public.bookings for insert with check(customer_id=auth.uid()); create policy "admins update bookings" on public.bookings for update using(public.is_admin()) with check(public.is_admin()); create policy "customers cancel own received bookings" on public.bookings for update using(customer_id=auth.uid() and status in ('received','confirmed')) with check(customer_id=auth.uid() and status='cancelled');
create policy "history visible for booking owner" on public.booking_status_history for select using (exists(select 1 from public.bookings b where b.id=booking_id and (b.customer_id=auth.uid() or public.is_admin()))); create policy "admins create history" on public.booking_status_history for insert with check(public.is_admin());
create policy "published gallery public" on public.gallery_items for select using(is_published=true or public.is_admin()); create policy "admins manage gallery" on public.gallery_items for all using(public.is_admin()) with check(public.is_admin()); create policy "reviews readable" on public.reviews for select using(true); create policy "customers create own review" on public.reviews for insert with check(customer_id=auth.uid()); create policy "admins manage reviews" on public.reviews for update using(public.is_admin()); create policy "promotions readable" on public.promotions for select using(is_active=true or public.is_admin()); create policy "admins manage promotions" on public.promotions for all using(public.is_admin()) with check(public.is_admin());

insert into storage.buckets(id,name,public) values ('inspiration','inspiration',false),('gallery','gallery',true),('avatars','avatars',true) on conflict do nothing;
create policy "customers upload inspiration" on storage.objects for insert to authenticated with check(bucket_id='inspiration' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "customers see own inspiration" on storage.objects for select to authenticated using(bucket_id='inspiration' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "public gallery files" on storage.objects for select using(bucket_id in ('gallery','avatars'));
create policy "admins manage public files" on storage.objects for all to authenticated using(bucket_id in ('gallery','avatars') and public.is_admin()) with check(bucket_id in ('gallery','avatars') and public.is_admin());

