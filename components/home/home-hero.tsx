import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type Props = {
  primaryHref: string;
};

const benefits = ["Chofer identificado", "Precio estimado claro", "Paga en efectivo o transferencia"];

export function HomeHero({ primaryHref }: Props) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#38BDF8]/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-[#1D4ED8]/10 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-[1200px] gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-[#1D4ED8]/20 bg-[#1D4ED8]/5 px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
            Plataforma de movilidad FueGo
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
            Pedi tu FueGo en segundos
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Viajes simples y rapidos, con seguimiento del estado del chofer y una experiencia clara desde que pedis hasta que llegas.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1E3A8A]"
            >
              Pedir FueGo
            </Link>
            <Link
              href="/registro-conductor"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#1D4ED8]/30 hover:bg-[#1D4ED8]/5"
            >
              Soy conductor
            </Link>
            <Link href="/registro-afiliado" className="text-sm font-semibold text-[#1D4ED8] hover:text-[#1E3A8A]">
              Quiero ser afiliado
            </Link>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {benefits.map((item) => (
              <div key={item} className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-[#1D4ED8]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] p-6 text-white">
              <p className="text-sm font-semibold">Estado del viaje</p>
              <p className="mt-1 text-xl font-bold">En camino</p>
              <p className="mt-3 text-sm text-blue-100">Chofer asignado y acercandose al punto de origen.</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Metodo de pago</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Transferencia o Efectivo</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Precio estimado</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Claro antes de pedir</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
