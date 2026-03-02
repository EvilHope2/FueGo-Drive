"use client";

import { useMemo, useState } from "react";

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
  const [searchCode, setSearchCode] = useState("");
  const normalizedCode = searchCode.trim().toUpperCase();

  const visibleAffiliates = useMemo(() => {
    if (!normalizedCode) return affiliates;
    return affiliates.filter((item) => (item.affiliate_code ?? "").toUpperCase().includes(normalizedCode));
  }, [affiliates, normalizedCode]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Afiliados</h2>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">Buscar por codigo</label>
        <input
          value={searchCode}
          onChange={(event) => setSearchCode(event.target.value)}
          placeholder="Ej: ABC123"
          className="field max-w-sm uppercase"
        />
      </div>
      <div className="mt-4 space-y-3">
        {visibleAffiliates.length === 0 ? (
          <p className="text-sm text-slate-600">No hay afiliados para ese codigo.</p>
        ) : (
          visibleAffiliates.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{item.full_name ?? "Afiliado"}</p>
              <p className="mt-1 text-xs text-slate-500">Codigo: {item.affiliate_code ?? "-"}</p>
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

