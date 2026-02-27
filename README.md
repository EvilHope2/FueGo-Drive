# FueGo MVP (Sin Mapa)

FueGo es una web estilo Uber para pedir autos, con panel de cliente y conductor, auth por roles y estado del viaje en tiempo real.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS + RPC)
- Vercel

## Funcionalidad incluida
- Cliente: crea viaje, ve historial, detalle con stepper y cancelacion (cuando aplica).
- Conductor: ve viajes disponibles, acepta viaje atomico y avanza estados en orden.
- Anti doble aceptacion con RPC `accept_ride`.
- Pricing B.1 por macrozona + recargo por barrio.
- WhatsApp con mensaje exacto: `Tu FueGo llego`.

## Estados
`Solicitado -> Aceptado -> En camino -> Llegando -> Afuera -> Finalizado`

Tambien existe `Cancelado` con reglas de bloqueo.

## Configurar Supabase
1. Crea proyecto en Supabase.
2. Ejecuta completo [`supabase/schema.sql`](./supabase/schema.sql) en SQL Editor.
3. Activa Auth por Email/Password.
4. Configura URL de Auth:
   - `Site URL`: `https://tu-dominio.vercel.app`
   - `Redirect URLs`: `https://tu-dominio.vercel.app/**`

## Variables de entorno
Crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

## Correr local
```bash
npm install
npm run dev
```

## Deploy Vercel
1. Importa repo en Vercel.
2. Carga las mismas env vars.
3. Deploy.

## SQL incluido en schema.sql
- Tablas: `profiles`, `rides`, `zone_base_prices`, `neighborhood_surcharges`.
- `rides` extendida con: `from_zone`, `from_neighborhood`, `to_zone`, `to_neighborhood`, `estimated_price`.
- RPC atomica: `accept_ride(p_ride_id uuid)`.
- RLS para customer, driver y admin.
- Seeds iniciales para matriz base por macrozona y recargos por barrio.

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
