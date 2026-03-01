begin;

-- 1) Profiles: rol affiliate + datos de referido
alter table public.profiles
  add column if not exists affiliate_code text,
  add column if not exists affiliate_referral_link text,
  add column if not exists referred_by_affiliate_id uuid references public.profiles(id),
  add column if not exists referred_by_affiliate_code text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'driver', 'admin', 'affiliate'));

create unique index if not exists profiles_affiliate_code_unique
  on public.profiles(affiliate_code)
  where affiliate_code is not null;

create index if not exists profiles_referred_affiliate_idx
  on public.profiles(referred_by_affiliate_id)
  where referred_by_affiliate_id is not null;

-- Genera codigo para afiliados sin codigo
update public.profiles
set affiliate_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where role = 'affiliate'
  and (affiliate_code is null or trim(affiliate_code) = '');

update public.profiles
set affiliate_referral_link = '/registro-conductor?ref=' || affiliate_code
where role = 'affiliate'
  and affiliate_code is not null
  and (affiliate_referral_link is null or trim(affiliate_referral_link) = '');

-- 2) Rides: reparto afiliado/admin/conductor
alter table public.rides
  add column if not exists affiliate_id uuid references public.profiles(id),
  add column if not exists affiliate_commission_percent numeric not null default 0,
  add column if not exists affiliate_commission_amount numeric not null default 0,
  add column if not exists admin_commission_percent numeric not null default 15,
  add column if not exists admin_commission_amount numeric not null default 0;

create index if not exists rides_affiliate_idx on public.rides(affiliate_id, created_at desc);

update public.rides
set affiliate_commission_percent = coalesce(affiliate_commission_percent, 0),
    affiliate_commission_amount = coalesce(affiliate_commission_amount, 0),
    admin_commission_percent = coalesce(admin_commission_percent, 15),
    admin_commission_amount = round(coalesce(estimated_price, 0) * coalesce(admin_commission_percent, 15) / 100),
    commission_percent = coalesce(admin_commission_percent, 15),
    commission_amount = round(coalesce(estimated_price, 0) * coalesce(admin_commission_percent, 15) / 100),
    driver_earnings = round(coalesce(estimated_price, 0))
      - round(coalesce(estimated_price, 0) * coalesce(admin_commission_percent, 15) / 100)
      - coalesce(affiliate_commission_amount, 0);

-- 3) Ganancias de afiliados
create table if not exists public.affiliate_earnings (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  ride_amount numeric not null,
  affiliate_commission_percent numeric not null,
  affiliate_commission_amount numeric not null,
  admin_commission_percent numeric not null,
  admin_commission_amount numeric not null,
  payout_status text not null default 'pending' check (payout_status in ('pending','paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(ride_id)
);

create index if not exists affiliate_earnings_affiliate_idx on public.affiliate_earnings(affiliate_id, created_at desc);
create index if not exists affiliate_earnings_driver_idx on public.affiliate_earnings(driver_id, created_at desc);

-- 4) Helper: busca afiliado por codigo (para registro conductor por link/codigo)
create or replace function public.get_affiliate_from_ref_code(p_code text)
returns table (
  id uuid,
  affiliate_code text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.affiliate_code, p.full_name
  from public.profiles p
  where p.role = 'affiliate'
    and p.affiliate_code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_affiliate_from_ref_code(text) from public;
grant execute on function public.get_affiliate_from_ref_code(text) to anon, authenticated;

-- 5) Trigger reglas de viaje: mantiene reparto consistente
create or replace function public.apply_ride_business_rules()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.origin_address = coalesce(new.origin_address, new.origin);
    new.destination_address = coalesce(new.destination_address, new.destination);
  end if;

  if new.affiliate_id is not null then
    new.affiliate_commission_percent = 5;
    new.admin_commission_percent = 10;
  else
    new.affiliate_commission_percent = 0;
    new.admin_commission_percent = 15;
  end if;

  new.affiliate_commission_amount = round(coalesce(new.estimated_price, 0) * new.affiliate_commission_percent / 100);
  new.admin_commission_amount = round(coalesce(new.estimated_price, 0) * new.admin_commission_percent / 100);
  new.driver_earnings = round(coalesce(new.estimated_price, 0)) - new.affiliate_commission_amount - new.admin_commission_amount;

  -- Compatibilidad con columnas previas
  new.commission_percent = new.admin_commission_percent;
  new.commission_amount = new.admin_commission_amount;

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

-- 6) Aceptacion atomica con afiliado y reparto 5/10/85 cuando aplica
create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
  v_driver public.profiles;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_driver
  from public.profiles
  where id = auth.uid();

  if v_driver.role <> 'driver' then
    raise exception 'NOT_DRIVER';
  end if;

  if v_driver.driver_account_status = 'suspended_debt' then
    raise exception 'DRIVER_SUSPENDED_DEBT';
  end if;

  update public.rides
  set driver_id = auth.uid(),
      status = 'Aceptado',
      accepted_at = coalesce(accepted_at, now()),
      affiliate_id = v_driver.referred_by_affiliate_id,
      affiliate_commission_percent = case when v_driver.referred_by_affiliate_id is not null then 5 else 0 end,
      affiliate_commission_amount = round(coalesce(estimated_price, 0) * case when v_driver.referred_by_affiliate_id is not null then 0.05 else 0 end),
      admin_commission_percent = case when v_driver.referred_by_affiliate_id is not null then 10 else 15 end,
      admin_commission_amount = round(coalesce(estimated_price, 0) * case when v_driver.referred_by_affiliate_id is not null then 0.10 else 0.15 end),
      commission_percent = case when v_driver.referred_by_affiliate_id is not null then 10 else 15 end,
      commission_amount = round(coalesce(estimated_price, 0) * case when v_driver.referred_by_affiliate_id is not null then 0.10 else 0.15 end),
      driver_earnings = round(coalesce(estimated_price, 0))
        - round(coalesce(estimated_price, 0) * case when v_driver.referred_by_affiliate_id is not null then 0.10 else 0.15 end)
        - round(coalesce(estimated_price, 0) * case when v_driver.referred_by_affiliate_id is not null then 0.05 else 0 end),
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

-- 7) Wallet conductor: deuda solo por comision admin (no afiliado)
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
      (coalesce(new.admin_commission_amount, coalesce(new.commission_amount, 0)) * -1),
      'Comisión FueGo por viaje',
      new.payment_method,
      null
    );
  end if;

  return new;
end;
$$;

-- 8) Ganancia afiliado por viaje finalizado
create or replace function public.sync_affiliate_earning_on_ride_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Finalizado'
     and old.status is distinct from new.status
     and new.affiliate_id is not null
     and new.driver_id is not null then
    insert into public.affiliate_earnings (
      affiliate_id,
      driver_id,
      ride_id,
      ride_amount,
      affiliate_commission_percent,
      affiliate_commission_amount,
      admin_commission_percent,
      admin_commission_amount
    )
    values (
      new.affiliate_id,
      new.driver_id,
      new.id,
      coalesce(new.estimated_price, 0),
      coalesce(new.affiliate_commission_percent, 0),
      coalesce(new.affiliate_commission_amount, 0),
      coalesce(new.admin_commission_percent, 15),
      coalesce(new.admin_commission_amount, 0)
    )
    on conflict (ride_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists rides_affiliate_earning on public.rides;
create trigger rides_affiliate_earning
after update on public.rides
for each row execute function public.sync_affiliate_earning_on_ride_finish();

-- 9) Hook de auth: guarda afiliado referido al crear conductor
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_affiliate_code text;
  v_affiliate_referral_link text;
  v_referred_affiliate_id uuid;
  v_referred_code text;
  v_referred_affiliate_id_text text;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::text, 'customer');
  v_affiliate_code := upper(nullif(new.raw_user_meta_data ->> 'affiliate_code', ''));
  v_affiliate_referral_link := nullif(new.raw_user_meta_data ->> 'affiliate_referral_link', '');
  v_referred_code := upper(nullif(new.raw_user_meta_data ->> 'referred_by_affiliate_code', ''));
  v_referred_affiliate_id_text := nullif(new.raw_user_meta_data ->> 'referred_by_affiliate_id', '');

  if v_role = 'affiliate' then
    if v_affiliate_code is null then
      v_affiliate_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;
    if v_affiliate_referral_link is null then
      v_affiliate_referral_link := '/registro-conductor?ref=' || v_affiliate_code;
    end if;
  end if;

  if v_role = 'driver' then
    if v_referred_affiliate_id_text is not null
       and v_referred_affiliate_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select p.id, p.affiliate_code
      into v_referred_affiliate_id, v_referred_code
      from public.profiles p
      where p.id = v_referred_affiliate_id_text::uuid
        and p.role = 'affiliate'
      limit 1;
    elsif v_referred_code is not null then
      select p.id, p.affiliate_code
      into v_referred_affiliate_id, v_referred_code
      from public.profiles p
      where p.role = 'affiliate'
        and p.affiliate_code = v_referred_code
      limit 1;
    end if;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    affiliate_code,
    affiliate_referral_link,
    referred_by_affiliate_id,
    referred_by_affiliate_code,
    vehicle_plate,
    vehicle_brand,
    vehicle_model_year
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), ''),
    v_role,
    v_affiliate_code,
    v_affiliate_referral_link,
    v_referred_affiliate_id,
    v_referred_code,
    nullif(upper(trim(coalesce(new.raw_user_meta_data ->> 'vehicle_plate', ''))), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'vehicle_brand', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'vehicle_model_year', '')), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    affiliate_code = coalesce(public.profiles.affiliate_code, excluded.affiliate_code),
    affiliate_referral_link = coalesce(public.profiles.affiliate_referral_link, excluded.affiliate_referral_link),
    referred_by_affiliate_id = coalesce(public.profiles.referred_by_affiliate_id, excluded.referred_by_affiliate_id),
    referred_by_affiliate_code = coalesce(public.profiles.referred_by_affiliate_code, excluded.referred_by_affiliate_code);

  return new;
end;
$$;

-- 10) RLS afiliados
alter table public.affiliate_earnings enable row level security;

drop policy if exists "affiliate_earnings_affiliate_select_own" on public.affiliate_earnings;
drop policy if exists "affiliate_earnings_admin_all" on public.affiliate_earnings;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or (public.current_role() = 'affiliate' and referred_by_affiliate_id = auth.uid())
);

drop policy if exists "rides_affiliate_select_own" on public.rides;
create policy "rides_affiliate_select_own" on public.rides
for select
using (public.current_role() = 'affiliate' and affiliate_id = auth.uid());

create policy "affiliate_earnings_affiliate_select_own"
on public.affiliate_earnings
for select
using (affiliate_id = auth.uid());

create policy "affiliate_earnings_admin_all"
on public.affiliate_earnings
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

commit;
