-- Perfil de conductor: actualizacion segura + bloqueo de datos sensibles
begin;

alter table public.profiles
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model_year text;

create or replace function public.update_driver_profile(
  p_full_name text,
  p_phone text,
  p_vehicle_plate text default null,
  p_vehicle_brand text default null,
  p_vehicle_model_year text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_updated public.profiles;
  v_digits text;
  v_phone text;
  v_plate text;
  v_brand text;
  v_model_year text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.role <> 'driver' then
    raise exception 'ONLY_DRIVER_ALLOWED';
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'FULL_NAME_INVALID';
  end if;

  v_digits := regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g');

  if v_digits = '' then
    raise exception 'PHONE_INVALID_PREFIX';
  elsif v_digits like '549%' then
    v_phone := '+' || v_digits;
  elsif v_digits like '54%' then
    v_phone := '+549' || substring(v_digits from 3);
  elsif v_digits like '0%' then
    v_phone := '+549' || regexp_replace(v_digits, '^0+', '');
  else
    v_phone := '+549' || v_digits;
  end if;

  if v_phone !~ '^\\+549[0-9]{6,}$' then
    raise exception 'PHONE_INVALID_PREFIX';
  end if;

  if nullif(trim(coalesce(v_profile.vehicle_plate, '')), '') is not null then
    if p_vehicle_plate is not null
       and nullif(trim(p_vehicle_plate), '') is not null
       and upper(trim(p_vehicle_plate)) is distinct from upper(v_profile.vehicle_plate) then
      raise exception 'VEHICLE_FIELD_LOCKED';
    end if;
    v_plate := v_profile.vehicle_plate;
  else
    v_plate := nullif(upper(trim(coalesce(p_vehicle_plate, ''))), '');
  end if;

  if nullif(trim(coalesce(v_profile.vehicle_brand, '')), '') is not null then
    if p_vehicle_brand is not null
       and nullif(trim(p_vehicle_brand), '') is not null
       and trim(p_vehicle_brand) is distinct from v_profile.vehicle_brand then
      raise exception 'VEHICLE_FIELD_LOCKED';
    end if;
    v_brand := v_profile.vehicle_brand;
  else
    v_brand := nullif(trim(coalesce(p_vehicle_brand, '')), '');
  end if;

  if nullif(trim(coalesce(v_profile.vehicle_model_year, '')), '') is not null then
    if p_vehicle_model_year is not null
       and nullif(trim(p_vehicle_model_year), '') is not null
       and trim(p_vehicle_model_year) is distinct from v_profile.vehicle_model_year then
      raise exception 'VEHICLE_FIELD_LOCKED';
    end if;
    v_model_year := v_profile.vehicle_model_year;
  else
    v_model_year := nullif(trim(coalesce(p_vehicle_model_year, '')), '');
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      phone = v_phone,
      vehicle_plate = coalesce(v_plate, vehicle_plate),
      vehicle_brand = coalesce(v_brand, vehicle_brand),
      vehicle_model_year = coalesce(v_model_year, vehicle_model_year),
      updated_at = now()
  where id = auth.uid()
  returning * into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.update_driver_profile(text, text, text, text, text) from public;
grant execute on function public.update_driver_profile(text, text, text, text, text) to authenticated;

create or replace function public.protect_driver_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_is_admin boolean := false;
  v_is_user_action boolean := auth.uid() is not null;
begin
  if v_is_user_action then
    select exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    ) into v_actor_is_admin;
  end if;

  if v_is_user_action and not v_actor_is_admin and old.id <> auth.uid() then
    raise exception 'PROFILE_UPDATE_FORBIDDEN';
  end if;

  if v_is_user_action and not v_actor_is_admin then
    if new.role is distinct from old.role then
      raise exception 'ROLE_CHANGE_NOT_ALLOWED';
    end if;

    if new.driver_account_status is distinct from old.driver_account_status then
      raise exception 'DRIVER_ACCOUNT_STATUS_LOCKED';
    end if;

    if new.wallet_limit_negative is distinct from old.wallet_limit_negative then
      raise exception 'WALLET_LIMIT_LOCKED';
    end if;
  end if;

  new.full_name := trim(coalesce(new.full_name, old.full_name));
  new.phone := trim(coalesce(new.phone, old.phone));
  new.vehicle_plate := nullif(upper(trim(coalesce(new.vehicle_plate, ''))), '');
  new.vehicle_brand := nullif(trim(coalesce(new.vehicle_brand, '')), '');
  new.vehicle_model_year := nullif(trim(coalesce(new.vehicle_model_year, '')), '');

  if v_is_user_action and coalesce(new.role, old.role) = 'driver' then
    if coalesce(new.phone, '') !~ '^\\+549[0-9]{6,}$' then
      raise exception 'PHONE_INVALID_PREFIX';
    end if;

    if not v_actor_is_admin then
      if nullif(trim(coalesce(old.vehicle_plate, '')), '') is not null
         and new.vehicle_plate is distinct from old.vehicle_plate then
        raise exception 'VEHICLE_FIELD_LOCKED';
      end if;

      if nullif(trim(coalesce(old.vehicle_brand, '')), '') is not null
         and new.vehicle_brand is distinct from old.vehicle_brand then
        raise exception 'VEHICLE_FIELD_LOCKED';
      end if;

      if nullif(trim(coalesce(old.vehicle_model_year, '')), '') is not null
         and new.vehicle_model_year is distinct from old.vehicle_model_year then
        raise exception 'VEHICLE_FIELD_LOCKED';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_driver_profile_fields on public.profiles;
create trigger trg_protect_driver_profile_fields
before update on public.profiles
for each row
execute function public.protect_driver_profile_fields();

commit;
