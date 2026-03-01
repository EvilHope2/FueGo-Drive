"use client";

import { formatDateTime, formatCurrencyARS } from "@/lib/utils";
import type { AffiliateEarning, Profile } from "@/lib/types";

type DriverRow = Pick<Profile, "id" | "full_name" | "created_at"> & {
  total_rides?: number;
  total_generated?: number;
};

type Props = {
  affiliateCode: string;
  referralLink: string;
  drivers: DriverRow[];
  earnings: AffiliateEarning[];
};

export function AffiliateDashboard({ affiliateCode, referralLink, drivers, earnings }: Props) {
  const totalGenerated = earnings.reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);
  const totalRides = earnings.length;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Código de afiliado</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{affiliateCode}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conductores referidos</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{drivers.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Viajes generados</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalRides}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total generado</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrencyARS(totalGenerated)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Link de registro</h2>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{referralLink}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Conductores referidos</h2>
        <div className="mt-4 space-y-3">
          {drivers.length === 0 ? (
            <p className="text-sm text-slate-600">Todavía no tenés conductores referidos.</p>
          ) : (
            drivers.map((driver) => (
              <article key={driver.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{driver.full_name ?? "Conductor"}</p>
                <p className="mt-1 text-xs text-slate-500">Registro: {formatDateTime(driver.created_at)}</p>
                <p className="mt-1 text-sm text-slate-700">Viajes: {driver.total_rides ?? 0}</p>
                <p className="mt-1 text-sm text-slate-700">Total generado: {formatCurrencyARS(driver.total_generated ?? 0)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ganancias por viajes</h2>
        <div className="mt-4 space-y-3">
          {earnings.length === 0 ? (
            <p className="text-sm text-slate-600">Sin ganancias registradas todavía.</p>
          ) : (
            earnings.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  Viaje #{item.ride_id.slice(0, 8)} - {item.driver_profile?.full_name ?? "Conductor"}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                <p className="mt-1 text-sm text-slate-700">Monto viaje: {formatCurrencyARS(item.ride_amount)}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Comisión afiliado ({Math.round(item.affiliate_commission_percent)}%): {formatCurrencyARS(item.affiliate_commission_amount)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

