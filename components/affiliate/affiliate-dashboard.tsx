"use client";

import { useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";
import type { AffiliateEarning, Profile } from "@/lib/types";

type DriverStatus = "sin_viajes" | "activo" | "suspendido";

type DriverRow = Pick<Profile, "id" | "full_name" | "created_at"> & {
  total_rides?: number;
  total_generated?: number;
  last_ride_at?: string | null;
  status?: DriverStatus;
};

type Props = {
  affiliateCode: string;
  referralLink: string;
  drivers: DriverRow[];
  earnings: AffiliateEarning[];
  supportPhone: string;
};

function getStartDate(period: "7d" | "30d" | "mes" | "todos") {
  const now = new Date();
  if (period === "todos") return null;
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d;
  }
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(now.getDate() - 30);
    return d;
  }

  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function AffiliateDashboard({ affiliateCode, referralLink, drivers, earnings, supportPhone }: Props) {
  const [period, setPeriod] = useState<"7d" | "30d" | "mes" | "todos">("mes");
  const startDate = getStartDate(period);

  const filteredEarnings = useMemo(() => {
    if (!startDate) return earnings;
    return earnings.filter((item) => new Date(item.created_at) >= startDate);
  }, [earnings, startDate]);

  const totalGenerated = filteredEarnings.reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);
  const totalRides = filteredEarnings.length;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthEarnings = earnings.filter((item) => new Date(item.created_at) >= monthStart);
  const monthGenerated = monthEarnings.reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);

  const activeDriverIds = new Set(filteredEarnings.map((item) => item.driver_id));
  const activeDrivers = drivers.filter((driver) => activeDriverIds.has(driver.id)).length;

  const topDrivers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; rides: number }>();
    for (const row of filteredEarnings) {
      const current = map.get(row.driver_id) ?? {
        name: row.driver_profile?.full_name ?? "Conductor",
        total: 0,
        rides: 0,
      };
      current.total += Number(row.affiliate_commission_amount ?? 0);
      current.rides += 1;
      map.set(row.driver_id, current);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 3);
  }, [filteredEarnings]);

  const pendingCount = filteredEarnings.filter((item) => item.payout_status !== "paid").length;
  const paidCount = filteredEarnings.filter((item) => item.payout_status === "paid").length;

  const withdrawMessage = `Buenas, quiero retirar mis ganancias de afiliado en FueGo. Codigo: ${affiliateCode}. Periodo: ${period}. Total a retirar: ${formatCurrencyARS(totalGenerated)}.`;
  const withdrawHref = buildWhatsAppLink(supportPhone, withdrawMessage);

  const copyText = async (value: string, success: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(success);
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Codigo de afiliado</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{affiliateCode}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(affiliateCode, "Codigo copiado")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar codigo
            </button>
            <button
              type="button"
              onClick={() => copyText(referralLink, "Link copiado")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
            >
              <Share2 className="h-3.5 w-3.5" /> Copiar link
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conductores referidos</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{drivers.length}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Conductores activos</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{activeDrivers}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Viajes este periodo</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalRides}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Generado este mes</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrencyARS(monthGenerated)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Ganancias por viajes</h2>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as "7d" | "30d" | "mes" | "todos")}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="mes">Este mes</option>
              <option value="7d">Ultimos 7 dias</option>
              <option value="30d">Ultimos 30 dias</option>
              <option value="todos">Todo</option>
            </select>
            <a
              href={withdrawHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Retirar comision
            </a>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600">Total del periodo: <span className="font-semibold text-slate-900">{formatCurrencyARS(totalGenerated)}</span></p>
        <p className="mt-1 text-xs text-slate-500">Pendientes: {pendingCount} | Pagadas: {paidCount}</p>

        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{referralLink}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Top conductores</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {topDrivers.length === 0 ? (
            <p className="text-sm text-slate-600">Sin datos para el periodo seleccionado.</p>
          ) : (
            topDrivers.map((item, index) => (
              <article key={`${item.name}-${index}`} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-700">Viajes: {item.rides}</p>
                <p className="mt-1 text-sm text-slate-700">Comision: {formatCurrencyARS(item.total)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Conductores referidos</h2>
        <div className="mt-4 space-y-3">
          {drivers.length === 0 ? (
            <p className="text-sm text-slate-600">Todavia no tenes conductores referidos.</p>
          ) : (
            drivers.map((driver) => {
              const statusLabel =
                driver.status === "suspendido" ? "Suspendido por deuda" : driver.status === "activo" ? "Activo" : "Sin viajes";
              const statusClass =
                driver.status === "suspendido"
                  ? "bg-rose-100 text-rose-700"
                  : driver.status === "activo"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700";

              return (
                <article key={driver.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{driver.full_name ?? "Conductor"}</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Registro: {formatDateTime(driver.created_at)}</p>
                  <p className="mt-1 text-sm text-slate-700">Viajes: {driver.total_rides ?? 0}</p>
                  <p className="mt-1 text-sm text-slate-700">Total generado: {formatCurrencyARS(driver.total_generated ?? 0)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ultimo viaje: {driver.last_ride_at ? formatDateTime(driver.last_ride_at) : "Sin viajes"}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Detalle de ganancias</h2>
        <div className="mt-4 space-y-3">
          {filteredEarnings.length === 0 ? (
            <p className="text-sm text-slate-600">Sin ganancias registradas para este periodo.</p>
          ) : (
            filteredEarnings.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Viaje #{item.ride_id.slice(0, 8)} - {item.driver_profile?.full_name ?? "Conductor"}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.payout_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.payout_status === "paid" ? "Pagado" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                <p className="mt-1 text-sm text-slate-700">Monto viaje: {formatCurrencyARS(item.ride_amount)}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Comision afiliado ({Math.round(item.affiliate_commission_percent)}%): {formatCurrencyARS(item.affiliate_commission_amount)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
