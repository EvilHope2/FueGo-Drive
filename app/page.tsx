import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
            FueGo movilidad urbana
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Pedí tu FueGo en segundos</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Seguí tu viaje con estados claros: en camino, llegando y afuera.
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

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">1. Pedí tu viaje</h2>
          <p className="mt-2 text-sm text-slate-600">Elegí barrios, direcciones y revisá el estimado antes de confirmar.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">2. Conductor acepta</h2>
          <p className="mt-2 text-sm text-slate-600">Los conductores toman viajes de forma segura, sin doble aceptación.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">3. Seguimiento claro</h2>
          <p className="mt-2 text-sm text-slate-600">Mirá cada estado del viaje y contactá por WhatsApp cuando corresponda.</p>
        </article>
      </section>

      <footer className="mt-8 border-t border-slate-200 py-5 text-center text-sm text-slate-500">FueGo · Servicio de movilidad</footer>
    </main>
  );
}

