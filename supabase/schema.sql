-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'driver', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid references public.profiles (id) on delete set null,
  origin text not null,
  destination text not null,
  note text,
  customer_name text not null,
  customer_phone text not null,
  status text not null check (status in ('Solicitado', 'Aceptado', 'En camino', 'Llegando', 'Afuera', 'Finalizado', 'Cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  en_route_at timestamptz,
  arriving_at timestamptz,
  outside_at timestamptz,
  finished_at timestamptz
);

create index if not exists rides_customer_idx on public.rides (customer_id, created_at desc);
create index if not exists rides_driver_idx on public.rides (driver_id, created_at desc);
create index if not exists rides_status_idx on public.rides (status);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists rides_updated_at on public.rides;
create trigger rides_updated_at
before update on public.rides
for each row
execute function public.handle_updated_at();

create or replace function public.handle_ride_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'Aceptado' and new.accepted_at is null then new.accepted_at = now(); end if;
    if new.status = 'En camino' and new.en_route_at is null then new.en_route_at = now(); end if;
    if new.status = 'Llegando' and new.arriving_at is null then new.arriving_at = now(); end if;
    if new.status = 'Afuera' and new.outside_at is null then new.outside_at = now(); end if;
    if new.status = 'Finalizado' and new.finished_at is null then new.finished_at = now(); end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rides_status_timestamps on public.rides;
create trigger rides_status_timestamps
before update on public.rides
for each row
execute function public.handle_ride_status_timestamps();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::text, 'customer'),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.rides enable row level security;

-- profiles policies
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.current_role() = 'admin')
with check (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid() or public.current_role() = 'admin');

-- rides policies
create policy "rides_customer_insert"
on public.rides
for insert
with check (
  customer_id = auth.uid()
  and driver_id is null
  and status = 'Solicitado'
);

create policy "rides_customer_select_own"
on public.rides
for select
using (customer_id = auth.uid());

create policy "rides_customer_cancel"
on public.rides
for update
using (
  customer_id = auth.uid()
  and status in ('Solicitado', 'Aceptado')
)
with check (
  customer_id = auth.uid()
  and status = 'Cancelado'
);

create policy "rides_driver_select_requested_and_own"
on public.rides
for select
using (
  public.current_role() = 'driver'
  and (status = 'Solicitado' or driver_id = auth.uid())
);

create policy "rides_driver_accept"
on public.rides
for update
using (
  public.current_role() = 'driver'
  and status = 'Solicitado'
  and driver_id is null
)
with check (
  public.current_role() = 'driver'
  and driver_id = auth.uid()
  and status = 'Aceptado'
);

create policy "rides_driver_update_own"
on public.rides
for update
using (
  public.current_role() = 'driver'
  and driver_id = auth.uid()
)
with check (
  public.current_role() = 'driver'
  and driver_id = auth.uid()
  and status in ('Aceptado', 'En camino', 'Llegando', 'Afuera', 'Finalizado', 'Cancelado')
);

create policy "rides_admin_all"
on public.rides
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
