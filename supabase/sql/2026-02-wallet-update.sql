-- FueGo wallet update (incremental)
-- Ejecutar en Supabase SQL Editor

begin;

-- 1) rides: payment_method
alter table public.rides
  add column if not exists payment_method text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rides_payment_method_check'
      and conrelid = 'public.rides'::regclass
  ) then
    alter table public.rides
      add constraint rides_payment_method_check
      check (payment_method in ('cash','transfer','platform','unknown'));
  end if;
end $$;

-- 2) profiles: status + debt limit
alter table public.profiles
  add column if not exists driver_account_status text not null default 'active',
  add column if not exists wallet_limit_negative numeric not null default -20000;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_driver_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_driver_account_status_check
      check (driver_account_status in ('active','suspended_debt'));
  end if;
end $$;

-- 3) wallet transactions table
create table if not exists public.driver_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid null references public.rides(id) on delete set null,
  type text not null check (type in ('commission_charge','payment','adjustment')),
  amount numeric not null,
  description text not null,
  payment_method text null check (payment_method in ('cash','transfer','platform','manual')),
  notes text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_wallet_transactions_driver_id
  on public.driver_wallet_transactions(driver_id);

create index if not exists idx_driver_wallet_transactions_ride_id
  on public.driver_wallet_transactions(ride_id);

create index if not exists idx_driver_wallet_transactions_created_at
  on public.driver_wallet_transactions(created_at desc);

create unique index if not exists idx_driver_wallet_commission_unique_ride
  on public.driver_wallet_transactions(ride_id)
  where type = 'commission_charge';

-- 4) helper function: refresh driver account status by wallet balance
create or replace function public.refresh_driver_account_status(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric := 0;
  v_limit numeric := -20000;
begin
  select coalesce(sum(amount), 0)
    into v_balance
  from public.driver_wallet_transactions
  where driver_id = p_driver_id;

  select coalesce(wallet_limit_negative, -20000)
    into v_limit
  from public.profiles
  where id = p_driver_id;

  update public.profiles
  set driver_account_status = case when v_balance <= v_limit then 'suspended_debt' else 'active' end,
      updated_at = now()
  where id = p_driver_id;
end;
$$;

-- 5) trigger: sync status when wallet changes
create or replace function public.driver_wallet_after_change_sync_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_driver_account_status(coalesce(new.driver_id, old.driver_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_driver_wallet_sync_status on public.driver_wallet_transactions;
create trigger trg_driver_wallet_sync_status
after insert or update or delete on public.driver_wallet_transactions
for each row execute function public.driver_wallet_after_change_sync_status();

-- 6) trigger: auto commission debt on finalized rides (cash/transfer)
create or replace function public.create_wallet_commission_charge_on_ride_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Finalizado'
     and old.status is distinct from new.status
     and new.driver_id is not null
     and coalesce(new.payment_method, 'unknown') in ('cash','transfer') then

    insert into public.driver_wallet_transactions (
      driver_id,
      ride_id,
      type,
      amount,
      description,
      payment_method,
      notes,
      created_by
    )
    values (
      new.driver_id,
      new.id,
      'commission_charge',
      -abs(coalesce(new.commission_amount, 0)),
      'Comision por viaje',
      new.payment_method,
      null,
      null
    )
    on conflict (ride_id)
    where type = 'commission_charge'
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_wallet_commission_charge_on_ride_finish on public.rides;
create trigger trg_create_wallet_commission_charge_on_ride_finish
after update on public.rides
for each row
execute function public.create_wallet_commission_charge_on_ride_finish();

-- 7) anti doble aceptacion + bloqueo por deuda
create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
  v_driver_status text;
begin
  select driver_account_status
    into v_driver_status
  from public.profiles
  where id = auth.uid();

  if v_driver_status = 'suspended_debt' then
    raise exception 'DRIVER_SUSPENDED_DEBT';
  end if;

  update public.rides
     set driver_id = auth.uid(),
         status = 'Aceptado',
         accepted_at = now(),
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

-- 8) RLS wallet table
alter table public.driver_wallet_transactions enable row level security;

drop policy if exists "Driver can read own wallet tx" on public.driver_wallet_transactions;
create policy "Driver can read own wallet tx"
on public.driver_wallet_transactions
for select
to authenticated
using (driver_id = auth.uid());

-- Admin: full wallet access
drop policy if exists "Admin full wallet tx access" on public.driver_wallet_transactions;
create policy "Admin full wallet tx access"
on public.driver_wallet_transactions
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

commit;
