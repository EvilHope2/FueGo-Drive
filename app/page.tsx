import Link from "next/link";

import { getHomeCounters } from "@/lib/home-stats";

export const revalidate = 300;

export default async function HomePage() {
  const { totalDrivers, totalCustomers, totalCompletedRides } = await getHomeCounters();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            FueGo movilidad urbana
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Pedi tu FueGo en segundos</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Segui tu viaje con estados claros: en camino, llegando y afuera.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Ingresar
            </Link>
            <Link
              href="/registro-cliente"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Registrarme
            </Link>
            <Link
              href="/registro-conductor"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Soy conductor
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm text-slate-600">Cada vez mas personas eligen y forman parte de FueGo.</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">FueGo sigue creciendo</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-4xl font-bold tracking-tight text-indigo-700">+{totalDrivers}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Conductores registrados</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-4xl font-bold tracking-tight text-indigo-700">+{totalCustomers}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Usuarios registrados</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-4xl font-bold tracking-tight text-indigo-700">+{totalCompletedRides}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">Viajes realizados</p>
          </article>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">1. Pedi tu viaje</h2>
          <p className="mt-2 text-sm text-slate-600">Elegi barrios, direcciones y revisa el estimado antes de confirmar.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">2. Conductor acepta</h2>
          <p className="mt-2 text-sm text-slate-600">Los conductores toman viajes de forma segura, sin doble aceptacion.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">3. Seguimiento claro</h2>
          <p className="mt-2 text-sm text-slate-600">Mira cada estado del viaje y contacta por WhatsApp cuando corresponda.</p>
        </article>
      </section>

      <footer className="mt-8 border-t border-slate-200 py-5 text-center text-sm text-slate-500">FueGo - Servicio de movilidad</footer>
    </main>
  );
}
