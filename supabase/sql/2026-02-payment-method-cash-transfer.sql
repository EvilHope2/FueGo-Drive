-- Solo cambio de metodo de pago en rides (cash/transfer)
begin;

alter table public.rides
  add column if not exists payment_method text;

-- Normaliza valores existentes para no romper el constraint
update public.rides
set payment_method = 'cash'
where payment_method is null
   or payment_method not in ('cash','transfer');

alter table public.rides
  alter column payment_method set default 'cash',
  alter column payment_method set not null;

alter table public.rides
  drop constraint if exists rides_payment_method_check;

alter table public.rides
  add constraint rides_payment_method_check
  check (payment_method in ('cash','transfer'));

commit;
