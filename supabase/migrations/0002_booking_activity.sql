create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'booking',
  is_read boolean not null default false,
  booking_id uuid references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists notifications_customer_idx on public.notifications(customer_id,created_at desc);
alter table public.notifications enable row level security;
create policy "customers see own notifications" on public.notifications for select using(customer_id=auth.uid() or public.is_admin());
create policy "customers mark own notifications read" on public.notifications for update using(customer_id=auth.uid()) with check(customer_id=auth.uid());
create policy "admins manage notifications" on public.notifications for all using(public.is_admin()) with check(public.is_admin());

create or replace function public.track_booking_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare message_title text; message_body text;
begin
  if tg_op='INSERT' then
    insert into public.booking_status_history(booking_id,status,note,created_by) values(new.id,new.status,'Booking received',new.customer_id);
    insert into public.notifications(customer_id,booking_id,title,body,type) values(new.customer_id,new.id,'Booking received','Your appointment has been received. We will confirm it shortly.','booking');
  elsif new.status is distinct from old.status then
    insert into public.booking_status_history(booking_id,status,created_by) values(new.id,new.status,auth.uid());
    message_title := case new.status when 'confirmed' then 'Appointment confirmed' when 'on_the_way' then 'Your barber is on the way' when 'arrived' then 'Your barber has arrived' when 'in_progress' then 'Your grooming session started' when 'completed' then 'Appointment completed' when 'cancelled' then 'Appointment cancelled' when 'rejected' then 'Appointment declined' else 'Booking updated' end;
    message_body := 'Your ' || coalesce((select name from public.services where id=new.service_id),'grooming') || ' appointment is now ' || replace(new.status::text,'_',' ') || '.';
    insert into public.notifications(customer_id,booking_id,title,body,type) values(new.customer_id,new.id,message_title,message_body,'booking');
  end if;
  return new;
end; $$;
drop trigger if exists booking_activity on public.bookings;
create trigger booking_activity after insert or update of status on public.bookings for each row execute procedure public.track_booking_activity();
