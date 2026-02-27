-- FueGo SQL completo: rides, pricing B.1, comisiones, liquidaciones, RPC anti doble aceptación y RLS

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  role text not null check (role in ('customer', 'driver', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  default_commission_percent numeric not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (default_commission_percent)
select 15
where not exists (select 1 from public.app_settings);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  driver_id uuid references public.profiles (id),
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
  finished_at timestamptz,
  canceled_at timestamptz
);

alter table public.rides add column if not exists origin_address text;
alter table public.rides add column if not exists destination_address text;
alter table public.rides add column if not exists from_zone text;
alter table public.rides add column if not exists from_neighborhood text;
alter table public.rides add column if not exists to_zone text;
alter table public.rides add column if not exists to_neighborhood text;
alter table public.rides add column if not exists estimated_price numeric not null default 0;
alter table public.rides add column if not exists commission_percent numeric not null default 15;
alter table public.rides add column if not exists commission_amount numeric not null default 0;
alter table public.rides add column if not exists driver_earnings numeric not null default 0;
alter table public.rides add column if not exists is_settled boolean not null default false;
alter table public.rides add column if not exists settled_at timestamptz;

update public.rides
set
  origin_address = coalesce(origin_address, origin),
  destination_address = coalesce(destination_address, destination),
  commission_percent = coalesce(commission_percent, 15),
  commission_amount = round(coalesce(estimated_price, 0) * coalesce(commission_percent, 15) / 100),
  driver_earnings = coalesce(estimated_price, 0) - round(coalesce(estimated_price, 0) * coalesce(commission_percent, 15) / 100)
where true;

create table if not exists public.zone_base_prices (
  id uuid primary key default gen_random_uuid(),
  from_zone text not null,
  to_zone text not null,
  base_price numeric not null check (base_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(from_zone, to_zone)
);

create table if not exists public.neighborhood_surcharges (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  neighborhood text not null unique,
  surcharge numeric not null default 0
);

create index if not exists rides_customer_idx on public.rides (customer_id, created_at desc);
create index if not exists rides_driver_idx on public.rides (driver_id, created_at desc);
create index if not exists rides_status_idx on public.rides (status);
create index if not exists rides_settled_idx on public.rides (is_settled, finished_at desc);
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
create trigger profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();

drop trigger if exists rides_updated_at on public.rides;
create trigger rides_updated_at before update on public.rides for each row execute function public.handle_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings for each row execute function public.handle_updated_at();

drop trigger if exists zone_base_prices_updated_at on public.zone_base_prices;
create trigger zone_base_prices_updated_at before update on public.zone_base_prices for each row execute function public.handle_updated_at();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.apply_ride_business_rules()
returns trigger
language plpgsql
as $$
declare
  v_default_commission numeric;
begin
  if tg_op = 'INSERT' then
    select default_commission_percent into v_default_commission
    from public.app_settings
    order by created_at asc
    limit 1;

    if new.commission_percent is null then
      new.commission_percent = coalesce(v_default_commission, 15);
    end if;

    new.origin_address = coalesce(new.origin_address, new.origin);
    new.destination_address = coalesce(new.destination_address, new.destination);
  end if;

  new.commission_percent = coalesce(new.commission_percent, 15);
  new.commission_amount = round(coalesce(new.estimated_price, 0) * new.commission_percent / 100);
  new.driver_earnings = coalesce(new.estimated_price, 0) - new.commission_amount;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'Aceptado' and new.accepted_at is null then new.accepted_at = now(); end if;
    if new.status = 'En camino' and new.en_route_at is null then new.en_route_at = now(); end if;
    if new.status = 'Llegando' and new.arriving_at is null then new.arriving_at = now(); end if;
    if new.status = 'Afuera' and new.outside_at is null then new.outside_at = now(); end if;
    if new.status = 'Finalizado' and new.finished_at is null then new.finished_at = now(); end if;
    if new.status = 'Cancelado' and new.canceled_at is null then new.canceled_at = now(); end if;
  end if;

  return new;
end;
$$;

drop trigger if exists rides_business_rules on public.rides;
create trigger rides_business_rules
before insert or update on public.rides
for each row
execute function public.apply_ride_business_rules();

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

create or replace function public.enforce_driver_ride_update_scope()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if public.current_role() = 'driver' and old.driver_id = auth.uid() then
    if new.estimated_price is distinct from old.estimated_price
      or new.commission_percent is distinct from old.commission_percent
      or new.commission_amount is distinct from old.commission_amount
      or new.driver_earnings is distinct from old.driver_earnings
      or new.customer_id is distinct from old.customer_id
      or new.driver_id is distinct from old.driver_id
    then
      raise exception 'DRIVER_UPDATE_NOT_ALLOWED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists rides_driver_scope_guard on public.rides;
create trigger rides_driver_scope_guard
before update on public.rides
for each row
execute function public.enforce_driver_ride_update_scope();

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
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), ''),
    coalesce((new.raw_user_meta_data ->> 'role')::text, 'customer')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case when public.profiles.full_name is null or public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.zone_base_prices enable row level security;
alter table public.neighborhood_surcharges enable row level security;
alter table public.app_settings enable row level security;

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
drop policy if exists "app_settings_read_authenticated" on public.app_settings;
drop policy if exists "app_settings_admin_write" on public.app_settings;

create policy "profiles_select_own_or_admin" on public.profiles for select
using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_update_own_or_admin" on public.profiles for update
using (id = auth.uid() or public.current_role() = 'admin')
with check (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles_insert_self" on public.profiles for insert
with check (id = auth.uid() or public.current_role() = 'admin');

create policy "rides_customer_insert" on public.rides for insert
with check (
  customer_id = auth.uid()
  and driver_id is null
  and status = 'Solicitado'
);

create policy "rides_customer_select_own" on public.rides for select
using (customer_id = auth.uid());

create policy "rides_customer_cancel" on public.rides for update
using (customer_id = auth.uid() and status in ('Solicitado', 'Aceptado'))
with check (customer_id = auth.uid() and status = 'Cancelado');

create policy "rides_driver_select_requested_and_own" on public.rides for select
using (public.current_role() = 'driver' and (status = 'Solicitado' or driver_id = auth.uid()));

create policy "rides_driver_accept" on public.rides for update
using (public.current_role() = 'driver' and status = 'Solicitado' and driver_id is null)
with check (public.current_role() = 'driver' and driver_id = auth.uid() and status = 'Aceptado');

create policy "rides_driver_update_own" on public.rides for update
using (public.current_role() = 'driver' and driver_id = auth.uid())
with check (
  public.current_role() = 'driver'
  and driver_id = auth.uid()
  and status in ('Aceptado', 'En camino', 'Llegando', 'Afuera', 'Finalizado', 'Cancelado')
);

create policy "rides_admin_all" on public.rides for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "zone_prices_read_authenticated" on public.zone_base_prices for select
using (auth.uid() is not null);

create policy "zone_prices_admin_write" on public.zone_base_prices for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "neighborhood_surcharges_read_authenticated" on public.neighborhood_surcharges for select
using (auth.uid() is not null);

create policy "neighborhood_surcharges_admin_write" on public.neighborhood_surcharges for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "app_settings_read_authenticated" on public.app_settings for select
using (auth.uid() is not null);

create policy "app_settings_admin_write" on public.app_settings for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

insert into public.neighborhood_surcharges (zone, neighborhood, surcharge)
values
  ('Centro y aledaños', 'Centro', 0),
  ('Centro y aledaños', 'Casco Viejo', 0),
  ('Centro y aledaños', 'AGP', 200),
  ('Centro y aledaños', 'Perón', 200),
  ('Centro y aledaños', 'Intevu', 300),
  ('Chacras', 'Chacra II', 400),
  ('Chacras', 'Chacra IV', 400),
  ('Chacras', 'Chacra XI', 500),
  ('Chacras', 'Chacra XIII (Malvinas Argentinas)', 600),
  ('Margen Sur', 'Margen Sur', 800),
  ('Margen Sur', 'Chacras de la Margen Sur', 1000),
  ('Norte y otras áreas', 'San Martín', 400),
  ('Norte y otras áreas', 'San Martín Norte', 500),
  ('Norte y otras áreas', 'Buena Vista', 600),
  ('Norte y otras áreas', 'Mutual', 600),
  ('Norte y otras áreas', 'Profesional', 600),
  ('Norte y otras áreas', 'CGT', 600),
  ('Norte y otras áreas', 'Las Barrancas', 700),
  ('Norte y otras áreas', 'Altos de la Estancia', 700),
  ('Norte y otras áreas', 'Los Cisnes', 700),
  ('Norte y otras áreas', 'Vapor Amadeo', 700),
  ('Norte y otras áreas', 'Ex Campamento de YPF', 800),
  ('Norte y otras áreas', 'Parque Industrial', 900),
  ('Norte y otras áreas', 'Aeropuerto', 1200)
on conflict (neighborhood) do update
set zone = excluded.zone,
    surcharge = excluded.surcharge;

with pairs as (
  select 'Centro y aledaños'::text as zone_a, 'Centro y aledaños'::text as zone_b, 2500::numeric as base_price union all
  select 'Centro y aledaños', 'Chacras', 3000 union all
  select 'Centro y aledaños', 'Margen Sur', 3800 union all
  select 'Centro y aledaños', 'Norte y otras áreas', 3300 union all
  select 'Chacras', 'Chacras', 2800 union all
  select 'Chacras', 'Margen Sur', 4200 union all
  select 'Chacras', 'Norte y otras áreas', 3600 union all
  select 'Margen Sur', 'Margen Sur', 3200 union all
  select 'Margen Sur', 'Norte y otras áreas', 4500 union all
  select 'Norte y otras áreas', 'Norte y otras áreas', 3000
), expanded as (
  select zone_a as from_zone, zone_b as to_zone, base_price from pairs
  union all
  select zone_b as from_zone, zone_a as to_zone, base_price from pairs where zone_a <> zone_b
)
insert into public.zone_base_prices (from_zone, to_zone, base_price)
select from_zone, to_zone, base_price from expanded
on conflict (from_zone, to_zone) do update
set base_price = excluded.base_price;

-- Wallet conductores + suspensión por deuda
alter table public.rides add column if not exists payment_method text not null default 'unknown';
alter table public.profiles add column if not exists driver_account_status text not null default 'active';
alter table public.profiles add column if not exists wallet_limit_negative numeric not null default -20000;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rides_payment_method_check'
  ) then
    alter table public.rides
      add constraint rides_payment_method_check
      check (payment_method in ('cash','transfer','platform','unknown'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_driver_account_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_driver_account_status_check
      check (driver_account_status in ('active','suspended_debt'));
  end if;
end $$;

create table if not exists public.driver_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id),
  ride_id uuid references public.rides(id),
  type text not null check (type in ('commission_charge','payment','adjustment')),
  amount numeric not null,
  description text not null,
  payment_method text check (payment_method in ('cash','transfer','platform','manual')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists dwt_driver_idx on public.driver_wallet_transactions(driver_id);
create index if not exists dwt_ride_idx on public.driver_wallet_transactions(ride_id);
create index if not exists dwt_created_idx on public.driver_wallet_transactions(created_at desc);

create or replace function public.refresh_driver_account_status(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_limit numeric;
begin
  select coalesce(sum(amount), 0) into v_balance
  from public.driver_wallet_transactions
  where driver_id = p_driver_id;

  select wallet_limit_negative into v_limit
  from public.profiles
  where id = p_driver_id;

  if v_limit is null then
    v_limit := -20000;
  end if;

  update public.profiles
  set driver_account_status = case when v_balance <= v_limit then 'suspended_debt' else 'active' end
  where id = p_driver_id and role = 'driver';
end;
$$;

create or replace function public.handle_wallet_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_driver_account_status(old.driver_id);
    return old;
  end if;

  perform public.refresh_driver_account_status(new.driver_id);
  return new;
end;
$$;

drop trigger if exists wallet_transactions_refresh_driver on public.driver_wallet_transactions;
create trigger wallet_transactions_refresh_driver
after insert or update or delete on public.driver_wallet_transactions
for each row execute function public.handle_wallet_transaction_change();

create or replace function public.create_wallet_commission_charge_for_ride()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Finalizado'
    and old.status is distinct from new.status
    and new.driver_id is not null
    and new.payment_method in ('cash','transfer')
    and not exists (
      select 1 from public.driver_wallet_transactions
      where ride_id = new.id
        and type = 'commission_charge'
    )
  then
    insert into public.driver_wallet_transactions (
      driver_id,
      ride_id,
      type,
      amount,
      description,
      payment_method,
      notes
    ) values (
      new.driver_id,
      new.id,
      'commission_charge',
      (coalesce(new.commission_amount, 0) * -1),
      'Comisión por viaje',
      new.payment_method,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists rides_wallet_commission on public.rides;
create trigger rides_wallet_commission
after update on public.rides
for each row execute function public.create_wallet_commission_charge_for_ride();

create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.role <> 'driver' then
    raise exception 'NOT_DRIVER';
  end if;

  if v_profile.driver_account_status = 'suspended_debt' then
    raise exception 'DRIVER_SUSPENDED_DEBT';
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

alter table public.driver_wallet_transactions enable row level security;

drop policy if exists "wallet_driver_select_own" on public.driver_wallet_transactions;
drop policy if exists "wallet_admin_all" on public.driver_wallet_transactions;

create policy "wallet_driver_select_own"
on public.driver_wallet_transactions
for select
using (driver_id = auth.uid());

create policy "wallet_admin_all"
on public.driver_wallet_transactions
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

