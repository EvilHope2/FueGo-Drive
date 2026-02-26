# FueGo MVP

App web para pedir autos estilo Uber (sin mapa) con stack Next.js + Supabase.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Deploy recomendado: Vercel

## Flujo MVP
- Cliente crea viaje en `/app`.
- Conductor acepta desde `/driver`.
- Cliente y conductor ven estado del viaje en detalle con polling cada 4s.
- Estados: `Solicitado`, `Aceptado`, `En camino`, `Llegando`, `Afuera`, `Finalizado`, `Cancelado`.
- WhatsApp preescrito exacto: `Tu FueGo llego`.

## 1) Configurar Supabase
1. Crea un proyecto en Supabase.
2. En SQL Editor, ejecuta [`supabase/schema.sql`](./supabase/schema.sql).
3. En Auth -> Providers deja Email/Password activo.
4. (Opcional) Si quieres flujo sin confirmacion por mail, desactiva "Confirm email" en Auth settings.

## 2) Variables de entorno
Crea `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

Tambien puedes copiar desde `.env.example`.

## 3) Correr en local
```bash
npm install
npm run dev
```

## 4) Deploy en Vercel
1. Importa el repo en Vercel.
2. Configura las mismas variables de entorno del `.env.local`.
3. Deploy.

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
- `/admin` (si tu usuario tiene rol admin)

## Notas
- Helper WhatsApp: `lib/whatsapp.ts` con `buildWhatsAppLink(phone, message)`.
- Mensaje obligatorio para WhatsApp: `Tu FueGo llego`.
- Seguridad de permisos implementada en RLS, no solo frontend.
