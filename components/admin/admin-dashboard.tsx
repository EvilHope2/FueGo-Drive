"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MoneyCard } from "@/components/common/money-card";
import { SettlementStatusBadge } from "@/components/common/settlement-status-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { RIDE_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";
import type { Ride } from "@/lib/types";

type Props = {
  initialRides: Ride[];
};

export function AdminDashboard({ initialRides }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [filter, setFilter] = useState<string>("Todos");

  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const finalizedWeek = rides.filter(
      (ride) => ride.status === "Finalizado" && new Date(ride.created_at) >= weekStart,
    );

    const totalBilled = rides.reduce((sum, ride) => sum + Number(ride.estimated_price ?? 0), 0);
    const totalCommission = rides.reduce((sum, ride) => sum + Number(ride.commission_amount ?? 0), 0);
    const totalDriverPay = rides.reduce((sum, ride) => sum + Number(ride.driver_earnings ?? 0), 0);

    return {
      totalTrips: rides.length,
      finalizedWeek: finalizedWeek.length,
      totalBilled,
      totalCommission,
      totalDriverPay,
    };
  }, [rides]);

  const cancelRide = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("rides").update({ status: "Cancelado" }).eq("id", id).select("*").single();
    if (data) {
      setRides((prev) => prev.map((ride) => (ride.id === id ? ({ ...ride, ...(data as Ride) } as Ride) : ride)));
    }
  };

  const visibleRides = rides.filter((ride) => filter === "Todos" || ride.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MoneyCard label="Viajes totales" value={String(metrics.totalTrips)} />
        <MoneyCard label="Finalizados (7 días)" value={String(metrics.finalizedWeek)} />
        <MoneyCard label="Total facturado" value={formatCurrencyARS(metrics.totalBilled)} />
        <MoneyCard label="Comisión FueGo" value={formatCurrencyARS(metrics.totalCommission)} />
        <MoneyCard label="A pagar conductores" value={formatCurrencyARS(metrics.totalDriverPay)} />
      </div>

      <div className="flex justify-end">
        <Link
          href="/admin/liquidaciones"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Ir a liquidaciones
        </Link>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Todos los viajes</h2>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option>Todos</option>
            {RIDE_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {visibleRides.map((ride) => (
            <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                </p>
                <div className="flex items-center gap-2">
                  <SettlementStatusBadge settled={Boolean(ride.is_settled)} />
                  <StatusBadge status={ride.status} />
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
                <p>Cliente: {ride.customer_name}</p>
                <p>Conductor: {ride.driver_profile?.full_name ?? "Sin asignar"}</p>
                <p>Estimado: {formatCurrencyARS(ride.estimated_price ?? null)}</p>
                <p>Comisión: {formatCurrencyARS(ride.commission_amount ?? null)}</p>
                <p>Ganancia conductor: {formatCurrencyARS(ride.driver_earnings ?? null)}</p>
              </div>
              {ride.status !== "Finalizado" && ride.status !== "Cancelado" ? (
                <button
                  onClick={() => cancelRide(ride.id)}
                  className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Cancelar viaje
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

