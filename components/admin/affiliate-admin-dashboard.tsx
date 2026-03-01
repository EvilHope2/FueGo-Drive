"use client";

import { formatCurrencyARS } from "@/lib/utils";

type AffiliateRow = {
  id: string;
  full_name: string | null;
  affiliate_code: string | null;
  referred_drivers: number;
  generated_rides: number;
  total_generated: number;
};

type Props = {
  affiliates: AffiliateRow[];
};

export function AffiliateAdminDashboard({ affiliates }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Afiliados</h2>
      <div className="mt-4 space-y-3">
        {affiliates.length === 0 ? (
          <p className="text-sm text-slate-600">No hay afiliados cargados todavía.</p>
        ) : (
          affiliates.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{item.full_name ?? "Afiliado"}</p>
              <p className="mt-1 text-xs text-slate-500">Código: {item.affiliate_code ?? "-"}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700 md:grid-cols-3">
                <p>Conductores referidos: {item.referred_drivers}</p>
                <p>Viajes generados: {item.generated_rides}</p>
                <p>Total generado: {formatCurrencyARS(item.total_generated)}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

