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
NEXT_PUBLIC_SUPPORT_WHATSAPP=549...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:soporte@fuego.app
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` y `VAPID_PRIVATE_KEY` son solo server.

## Correr local
```bash
npm install
npm run dev
```

## Deploy en Vercel
1. Importar repo.
2. Cargar env vars.
3. Deploy.

## PWA instalable
FueGo está preparado como PWA instalable en Android/Chrome.

- Manifest: `app/manifest.ts`
- Service worker: `public/sw.js`
- Registro del service worker + prompt de instalación: `components/pwa/pwa-provider.tsx`
- Íconos: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`

### Probar instalación en Android
1. Deploy en Vercel (HTTPS).
2. Abrir la app en Chrome Android.
3. Esperar el botón `Instalar FueGo` o usar menú `Agregar a pantalla principal`.
4. Abrir desde el ícono instalado (modo standalone).

### Cambiar íconos
Reemplazar los archivos en `public/icons/` manteniendo los nombres:
- `icon-192.png`
- `icon-512.png`
- `icon-512-maskable.png`

### Limpiar cache del service worker
En Chrome:
1. Mantener presionado ícono de la app e info del sitio, o abrir en navegador.
2. Borrar datos del sitio.
3. Recargar y reinstalar.

## Notificaciones push (conductores)
- Activación desde panel conductor: banner `Notificaciones de viajes`.
- Service worker push/click: `public/sw.js`.
- API suscripción:
  - `POST /api/push/subscribe`
  - `POST /api/push/unsubscribe`
- Disparo al crear viaje solicitado:
  - `POST /api/push/new-ride` (se llama al crear ride).
- Tabla Supabase:
  - `driver_push_subscriptions`
  - SQL: `supabase/sql/2026-03-driver-push-notifications.sql`

### Generar claves VAPID
```bash
npx web-push generate-vapid-keys
```

Copiar:
- `publicKey` -> `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `privateKey` -> `VAPID_PRIVATE_KEY`

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
- `/registro-afiliado` (ruta oculta)
- `/registro-cliente`
- `/registro-conductor`

Privadas:
- `/app`
- `/app/viaje/[id]`
- `/driver`
- `/driver/viaje/[id]`
- `/driver/wallet`
- `/affiliate`
- `/admin`
- `/admin/liquidaciones`
- `/admin/wallets`
- `/admin/afiliados`
