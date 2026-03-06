import Link from "next/link";

export function HomeForDrivers() {
  return (
    <section id="conductores" className="px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Sumate como conductor</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>- Viajes en tiempo real desde tu panel</li>
              <li>- Botones directos a Google Maps para origen y destino</li>
              <li>- Wallet para ver comisiones, pagos y saldo</li>
            </ul>
          </div>
          <div className="flex justify-start lg:justify-end">
            <Link
              href="/registro-conductor"
              className="inline-flex rounded-xl bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1E3A8A]"
            >
              Registrarme como conductor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
