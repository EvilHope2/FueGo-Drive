import Link from "next/link";

export function HomeForAffiliates() {
  return (
    <section id="afiliados" className="px-4 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Programa de Afiliados</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Ganas el 5% del valor total de cada viaje realizado por los conductores que registres con tu codigo.
            </p>
          </div>
          <div className="flex justify-start lg:justify-end">
            <Link
              href="/registro-afiliado"
              className="inline-flex rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#1D4ED8]/30 hover:bg-[#1D4ED8]/5"
            >
              Registrarme como afiliado
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
