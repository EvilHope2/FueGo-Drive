-- Incremental: datos de vehiculo para conductores en profiles
begin;

alter table public.profiles
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model_year text;

commit;
