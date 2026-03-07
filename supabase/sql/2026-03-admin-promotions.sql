begin;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null check (type in ('first_ride', 'general')),
  discount_percent numeric not null check (discount_percent >= 0 and discount_percent <= 100),
  max_discount_amount numeric,
  min_ride_amount numeric,
  max_uses_total integer,
  max_uses_per_user integer,
  starts_at timestamptz,
  ends_at timestamptz,
  allowed_payment_methods text[],
  message text,
  is_active boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  discount_percent numeric not null,
  discount_amount numeric not null,
  original_amount numeric not null,
  final_amount numeric not null,
  created_at timestamptz not null default now(),
  unique (ride_id)
);

alter table public.rides add column if not exists promotion_id uuid references public.promotions(id);
alter table public.rides add column if not exists discount_percent numeric not null default 0;
alter table public.rides add column if not exists discount_amount numeric not null default 0;
alter table public.rides add column if not exists original_amount numeric;
alter table public.rides add column if not exists final_amount numeric;

update public.rides
set
  original_amount = coalesce(original_amount, estimated_price, 0),
  final_amount = coalesce(final_amount, estimated_price, 0),
  discount_percent = coalesce(discount_percent, 0),
  discount_amount = coalesce(discount_amount, 0)
where true;

create index if not exists promotions_type_active_idx on public.promotions(type, is_active, created_at desc);
create index if not exists promotions_window_idx on public.promotions(starts_at, ends_at);
create index if not exists promotion_redemptions_promotion_idx on public.promotion_redemptions(promotion_id, created_at desc);
create index if not exists promotion_redemptions_customer_idx on public.promotion_redemptions(customer_id, created_at desc);
create index if not exists rides_promotion_idx on public.rides(promotion_id, created_at desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at
before update on public.promotions
for each row
execute function public.handle_updated_at();

create or replace function public.apply_ride_promotion_on_finalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original_amount numeric;
  v_discount_amount numeric;
  v_final_amount numeric;
  v_total_uses integer;
  v_user_uses integer;
  v_promotion record;
begin
  if tg_op <> 'UPDATE' or new.status <> 'Finalizado' or new.status = old.status then
    return new;
  end if;

  v_original_amount := coalesce(new.original_amount, new.estimated_price, 0);

  new.promotion_id := null;
  new.discount_percent := 0;
  new.discount_amount := 0;
  new.original_amount := v_original_amount;
  new.final_amount := v_original_amount;

  for v_promotion in
    select p.*
    from public.promotions p
    where p.is_active = true
      and p.deleted_at is null
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
      and (p.min_ride_amount is null or v_original_amount >= p.min_ride_amount)
      and (
        p.allowed_payment_methods is null
        or cardinality(p.allowed_payment_methods) = 0
        or coalesce(new.payment_method, '') = any(p.allowed_payment_methods)
      )
      and (
        p.type <> 'first_ride'
        or not exists (
          select 1
          from public.rides r
          where r.customer_id = new.customer_id
            and r.status = 'Finalizado'
            and r.id <> new.id
        )
      )
    order by case when p.type = 'first_ride' then 0 else 1 end, p.discount_percent desc, p.created_at asc
  loop
    if v_promotion.max_uses_total is not null then
      select count(*)::int into v_total_uses
      from public.promotion_redemptions pr
      where pr.promotion_id = v_promotion.id;

      if v_total_uses >= v_promotion.max_uses_total then
        continue;
      end if;
    end if;

    if v_promotion.max_uses_per_user is not null then
      select count(*)::int into v_user_uses
      from public.promotion_redemptions pr
      where pr.promotion_id = v_promotion.id
        and pr.customer_id = new.customer_id;

      if v_user_uses >= v_promotion.max_uses_per_user then
        continue;
      end if;
    end if;

    v_discount_amount := round(v_original_amount * coalesce(v_promotion.discount_percent, 0) / 100.0);
    if v_promotion.max_discount_amount is not null then
      v_discount_amount := least(v_discount_amount, v_promotion.max_discount_amount);
    end if;

    v_discount_amount := greatest(least(v_discount_amount, v_original_amount), 0);
    v_final_amount := greatest(v_original_amount - v_discount_amount, 0);

    new.promotion_id := v_promotion.id;
    new.discount_percent := v_promotion.discount_percent;
    new.discount_amount := v_discount_amount;
    new.final_amount := v_final_amount;
    exit;
  end loop;

  if new.affiliate_id is not null then
    new.affiliate_commission_percent := 5;
    new.admin_commission_percent := 10;
  else
    new.affiliate_commission_percent := 0;
    new.admin_commission_percent := 15;
  end if;

  new.affiliate_commission_amount := round(coalesce(new.final_amount, 0) * new.affiliate_commission_percent / 100.0);
  new.admin_commission_amount := round(coalesce(new.final_amount, 0) * new.admin_commission_percent / 100.0);
  new.commission_percent := new.admin_commission_percent;
  new.commission_amount := new.admin_commission_amount;
  new.driver_earnings := round(coalesce(new.final_amount, 0)) - new.affiliate_commission_amount - new.admin_commission_amount;

  if new.promotion_id is not null and not exists (
    select 1 from public.promotion_redemptions where ride_id = new.id
  ) then
    insert into public.promotion_redemptions (
      promotion_id,
      ride_id,
      customer_id,
      discount_percent,
      discount_amount,
      original_amount,
      final_amount
    ) values (
      new.promotion_id,
      new.id,
      new.customer_id,
      new.discount_percent,
      new.discount_amount,
      new.original_amount,
      new.final_amount
    );
  end if;

  return new;
end;
$$;

drop trigger if exists zz_rides_apply_promotion_on_finalize on public.rides;
create trigger zz_rides_apply_promotion_on_finalize
before update on public.rides
for each row
execute function public.apply_ride_promotion_on_finalize();

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
      coalesce(new.final_amount, new.original_amount, new.estimated_price, 0),
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

alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

drop policy if exists "promotions_admin_all" on public.promotions;
create policy "promotions_admin_all"
on public.promotions
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "promotion_redemptions_admin_all" on public.promotion_redemptions;
create policy "promotion_redemptions_admin_all"
on public.promotion_redemptions
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

commit;
