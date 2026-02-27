# FueGo (MVP sin mapa)

FueGo es una web tipo Uber sin mapa con paneles para cliente, conductor y admin.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS + RPC)
- Vercel

## Variables de entorno
Crear `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` no se usa en cliente.

## Correr local
```bash
npm install
npm run dev
```

## Deploy en Vercel
1. Importar repo.
2. Cargar env vars.
3. Deploy.

## Configurar Supabase
1. Abrir SQL Editor.
2. Ejecutar completo [`supabase/schema.sql`](./supabase/schema.sql).
3. Verificar tablas: `profiles`, `rides`, `zone_base_prices`, `neighborhood_surcharges`, `app_settings`, `driver_wallet_transactions`.

## Funcionalidad principal
- Roles: `customer`, `driver`, `admin`.
- Flujo de viaje por estados.
- Aceptación atómica con RPC `accept_ride` (anti doble aceptación).
- Pricing B.1 (base por zona + recargo por barrio).
- Comisión FueGo y ganancia conductor por viaje.
- Liquidaciones simples en `/admin/liquidaciones`.

## Wallet conductores
- Ruta conductor: `/driver/wallet`
- Ruta admin: `/admin/wallets`

Reglas wallet:
- `commission_charge` (negativo) al finalizar viaje con `payment_method` en `cash` o `transfer`.
- `payment` (positivo) y `adjustment` (positivo o negativo) desde admin.
- Saldo = suma de movimientos.

Suspensión por deuda:
- Límite por defecto: `-20000` (campo `wallet_limit_negative` en `profiles`).
- Si saldo `<= limit`: `driver_account_status = 'suspended_debt'`.
- En suspensión no puede aceptar viajes nuevos.
- Mensaje mostrado:
  - `Deuda $XXX. Pagar a este alias: fuegodriver (titular Nahuel Ramos)`

## Cambiar comisión por defecto
```sql
update public.app_settings
set default_commission_percent = 15;
```

## Cambiar recargos por barrio
```sql
update public.neighborhood_surcharges
set surcharge = 250
where neighborhood = 'AGP';
```

## Cambiar precios base por zona
```sql
update public.zone_base_prices
set base_price = 3400
where from_zone = 'Centro y aledaños' and to_zone = 'Norte y otras áreas';
```

## Rutas
Públicas:
- `/`
- `/login`
- `/registro-cliente`
- `/registro-conductor`

Privadas:
- `/app`
- `/app/viaje/[id]`
- `/driver`
- `/driver/viaje/[id]`
- `/driver/wallet`
- `/admin`
- `/admin/liquidaciones`
- `/admin/wallets`
