# FueGo (MVP sin mapa)

FueGo es una web tipo Uber sin mapa, con paneles para cliente, conductor y admin.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS + RPC)
- Deploy en Vercel

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
2. Cargar mismas env vars en Vercel.
3. Deploy.

## Configurar Supabase
1. Abrir SQL Editor.
2. Ejecutar completo [`supabase/schema.sql`](./supabase/schema.sql).
3. Verificar tablas creadas: `profiles`, `rides`, `zone_base_prices`, `neighborhood_surcharges`, `app_settings`.

## Qué incluye
- Auth por rol (`customer`, `driver`, `admin`).
- Flujo de viaje: Solicitado -> Aceptado -> En camino -> Llegando -> Afuera -> Finalizado/Cancelado.
- Aceptación atómica de viajes con RPC `accept_ride` (anti doble aceptación).
- Cálculo de precio por macrozona + recargo por barrio.
- Monetización:
  - `commission_percent`
  - `commission_amount`
  - `driver_earnings`
- Liquidación semanal simple en `/admin/liquidaciones`.
- WhatsApp con mensaje exacto: `Tu FueGo llego`.

## Configurar comisión por defecto
Tabla `app_settings`:

```sql
update public.app_settings
set default_commission_percent = 15;
```

## Cambiar precios por zona
Tabla `zone_base_prices`:

```sql
update public.zone_base_prices
set base_price = 3400
where from_zone = 'Centro y aledaños' and to_zone = 'Norte y otras áreas';
```

## Cambiar recargos por barrio
Tabla `neighborhood_surcharges`:

```sql
update public.neighborhood_surcharges
set surcharge = 250
where neighborhood = 'AGP';
```

## Liquidación semanal
Ruta: `/admin/liquidaciones`
- Filtros por conductor y rango de fechas.
- Opción semana actual.
- Acción para marcar viajes pendientes como liquidados (`is_settled = true`, `settled_at = now()`).

## Rutas
Publicas:
- `/`
- `/login`
- `/registro-cliente`
- `/registro-conductor`

Privadas:
- `/app`
- `/app/viaje/[id]`
- `/driver`
- `/driver/viaje/[id]`
- `/admin`
- `/admin/liquidaciones`
