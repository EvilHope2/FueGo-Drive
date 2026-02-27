-- FueGo schema + pricing B.1 + atomic ride acceptance
-- Run in Supabase SQL Editor

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

alter table public.rides add column if not exists from_zone text;
alter table public.rides add column if not exists from_neighborhood text;
alter table public.rides add column if not exists to_zone text;
alter table public.rides add column if not exists to_neighborhood text;
alter table public.rides add column if not exists estimated_price numeric;

create table if not exists public.zone_base_prices (
  id uuid primary key default gen_random_uuid(),
  from_zone text not null,
  to_zone text not null,
  base_price numeric not null check (base_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_zone, to_zone)
);

create table if not exists public.neighborhood_surcharges (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  neighborhood text not null unique,
  surcharge numeric not null check (surcharge >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rides_customer_idx on public.rides (customer_id, created_at desc);
create index if not exists rides_driver_idx on public.rides (driver_id, created_at desc);
create index if not exists rides_status_idx on public.rides (status);
create index if not exists rides_zone_trip_idx on public.rides (from_zone, to_zone);

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

drop trigger if exists zone_base_prices_updated_at on public.zone_base_prices;
create trigger zone_base_prices_updated_at
before update on public.zone_base_prices
for each row
execute function public.handle_updated_at();

drop trigger if exists neighborhood_surcharges_updated_at on public.neighborhood_surcharges;
create trigger neighborhood_surcharges_updated_at
before update on public.neighborhood_surcharges
for each row
execute function public.handle_updated_at();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

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

create or replace function public.validate_ride_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  if public.current_role() = 'admin' then
    return new;
  end if;

  if old.status in ('Finalizado', 'Cancelado') then
    raise exception 'STATUS_LOCKED';
  end if;

  if old.status = 'Solicitado' and new.status not in ('Aceptado', 'Cancelado') then
    raise exception 'INVALID_STATUS_FLOW';
  end if;

  if old.status = 'Aceptado' and new.status not in ('En camino', 'Cancelado') then
    raise exception 'INVALID_STATUS_FLOW';
  end if;

  if old.status = 'En camino' and new.status not in ('Llegando', 'Cancelado') then
    raise exception 'INVALID_STATUS_FLOW';
  end if;

  if old.status = 'Llegando' and new.status not in ('Afuera', 'Cancelado') then
    raise exception 'INVALID_STATUS_FLOW';
  end if;

  if old.status = 'Afuera' and new.status not in ('Finalizado', 'Cancelado') then
    raise exception 'INVALID_STATUS_FLOW';
  end if;

  return new;
end;
$$;

drop trigger if exists rides_status_flow on public.rides;
create trigger rides_status_flow
before update on public.rides
for each row
execute function public.validate_ride_status_transition();

create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if public.current_role() <> 'driver' then
    raise exception 'NOT_DRIVER';
  end if;

  update public.rides
  set
    driver_id = auth.uid(),
    status = 'Aceptado',
    accepted_at = coalesce(accepted_at, now()),
    updated_at = now()
  where id = p_ride_id
    and driver_id is null
    and status = 'Solicitado'
  returning * into v_ride;

  if v_ride.id is null then
    raise exception 'RIDE_NOT_AVAILABLE';
  end if;

  return v_ride;
end;
$$;

revoke all on function public.accept_ride(uuid) from public;
grant execute on function public.accept_ride(uuid) to authenticated;

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
alter table public.zone_base_prices enable row level security;
alter table public.neighborhood_surcharges enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;

drop policy if exists "rides_customer_insert" on public.rides;
drop policy if exists "rides_customer_select_own" on public.rides;
drop policy if exists "rides_customer_cancel" on public.rides;
drop policy if exists "rides_driver_select_requested_and_own" on public.rides;
drop policy if exists "rides_driver_accept" on public.rides;
drop policy if exists "rides_driver_update_own" on public.rides;
drop policy if exists "rides_admin_all" on public.rides;

drop policy if exists "zone_prices_read_authenticated" on public.zone_base_prices;
drop policy if exists "zone_prices_admin_write" on public.zone_base_prices;
drop policy if exists "neighborhood_surcharges_read_authenticated" on public.neighborhood_surcharges;
drop policy if exists "neighborhood_surcharges_admin_write" on public.neighborhood_surcharges;

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

create policy "rides_customer_insert"
on public.rides
for insert
with check (
  customer_id = auth.uid()
  and driver_id is null
  and status = 'Solicitado'
  and from_zone is not null
  and from_neighborhood is not null
  and to_zone is not null
  and to_neighborhood is not null
  and estimated_price is not null
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

create policy "zone_prices_read_authenticated"
on public.zone_base_prices
for select
using (auth.uid() is not null);

create policy "zone_prices_admin_write"
on public.zone_base_prices
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "neighborhood_surcharges_read_authenticated"
on public.neighborhood_surcharges
for select
using (auth.uid() is not null);

create policy "neighborhood_surcharges_admin_write"
on public.neighborhood_surcharges
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

insert into public.neighborhood_surcharges (zone, neighborhood, surcharge)
values
  ('Centro y aledanos', 'Centro', 0),
  ('Centro y aledanos', 'Casco Viejo', 0),
  ('Centro y aledanos', 'AGP', 200),
  ('Centro y aledanos', 'Peron', 200),
  ('Centro y aledanos', 'Intevu', 300),
  ('Chacras', 'Chacra II', 400),
  ('Chacras', 'Chacra IV', 400),
  ('Chacras', 'Chacra XI', 500),
  ('Chacras', 'Chacra XIII (Malvinas Argentinas)', 600),
  ('Margen Sur', 'Margen Sur', 800),
  ('Margen Sur', 'Chacras de la Margen Sur', 1000),
  ('Norte y otras areas', 'San Martin', 400),
  ('Norte y otras areas', 'San Martin Norte', 500),
  ('Norte y otras areas', 'Buena Vista', 600),
  ('Norte y otras areas', 'Mutual', 600),
  ('Norte y otras areas', 'Profesional', 600),
  ('Norte y otras areas', 'CGT', 600),
  ('Norte y otras areas', 'Las Barrancas', 700),
  ('Norte y otras areas', 'Altos de la Estancia', 700),
  ('Norte y otras areas', 'Los Cisnes', 700),
  ('Norte y otras areas', 'Vapor Amadeo', 700),
  ('Norte y otras areas', 'Ex Campamento de YPF', 800),
  ('Norte y otras areas', 'Parque Industrial', 900),
  ('Norte y otras areas', 'Aeropuerto', 1200)
on conflict (neighborhood) do update
set zone = excluded.zone,
    surcharge = excluded.surcharge,
    updated_at = now();

with pairs as (
  select 'Centro y aledanos'::text as zone_a, 'Centro y aledanos'::text as zone_b, 2500::numeric as base_price union all
  select 'Centro y aledanos', 'Chacras', 3000 union all
  select 'Centro y aledanos', 'Margen Sur', 3800 union all
  select 'Centro y aledanos', 'Norte y otras areas', 3300 union all
  select 'Chacras', 'Chacras', 2800 union all
  select 'Chacras', 'Margen Sur', 4200 union all
  select 'Chacras', 'Norte y otras areas', 3600 union all
  select 'Margen Sur', 'Margen Sur', 3200 union all
  select 'Margen Sur', 'Norte y otras areas', 4500 union all
  select 'Norte y otras areas', 'Norte y otras areas', 3000
), expanded as (
  select zone_a as from_zone, zone_b as to_zone, base_price from pairs
  union all
  select zone_b as from_zone, zone_a as to_zone, base_price from pairs where zone_a <> zone_b
)
insert into public.zone_base_prices (from_zone, to_zone, base_price)
select from_zone, to_zone, base_price from expanded
on conflict (from_zone, to_zone) do update
set base_price = excluded.base_price,
    updated_at = now();
