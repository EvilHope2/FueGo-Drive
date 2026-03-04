begin;

-- Fix definitivo:
-- 1) Solo generar comisión wallet al pasar a Finalizado.
-- 2) Si un viaje termina Cancelado, quitar cualquier comisión wallet de ese ride.
create or replace function public.create_wallet_commission_charge_for_ride()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si se cancela, borrar débito asociado por seguridad
  if new.status = 'Cancelado' then
    delete from public.driver_wallet_transactions
    where ride_id = new.id
      and type = 'commission_charge';
    return new;
  end if;

  -- Solo cobra comisión cuando el viaje se finaliza realmente
  if new.status = 'Finalizado'
    and old.status is distinct from new.status
    and new.driver_id is not null
    and coalesce(new.payment_method, 'unknown') in ('cash', 'transfer')
    and not exists (
      select 1
      from public.driver_wallet_transactions
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

-- Limpieza de datos históricos erróneos:
-- elimina débitos de rides que hoy NO están finalizados
delete from public.driver_wallet_transactions dwt
using public.rides r
where dwt.ride_id = r.id
  and dwt.type = 'commission_charge'
  and r.status <> 'Finalizado';

commit;
