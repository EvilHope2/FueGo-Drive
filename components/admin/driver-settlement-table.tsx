"use client";

import { useMemo, useState } from "react";

import { SettlementStatusBadge } from "@/components/common/settlement-status-badge";
import type { Ride } from "@/lib/types";
import { formatCurrencyARS } from "@/lib/utils";

type GroupedSettlement = {
  driverId: string;
  driverName: string;
  rides: Ride[];
  totalTrips: number;
  totalBilled: number;
  totalCommission: number;
  totalDriverEarnings: number;
};

type Props = {
  rides: Ride[];
  driverNames: Record<string, string>;
  onMarkSettled: (rideIds: string[]) => Promise<void>;
};

export function DriverSettlementTable({ rides, driverNames, onMarkSettled }: Props) {
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [weekOnly, setWeekOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return rides.filter((ride) => {
      if (!ride.driver_id) return false;
      if (selectedDriver !== "all" && ride.driver_id !== selectedDriver) return false;

      const created = new Date(ride.created_at);
      if (weekOnly) {
        const startWeek = new Date();
        startWeek.setDate(startWeek.getDate() - 7);
        if (created < startWeek) return false;
      }
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (created > to) return false;
      }

      return true;
    });
  }, [rides, selectedDriver, dateFrom, dateTo, weekOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedSettlement>();

    filtered.forEach((ride) => {
      if (!ride.driver_id) return;
      const current = map.get(ride.driver_id);
      const billed = Number(ride.estimated_price ?? 0);
      const commission = Number(ride.commission_amount ?? 0);
      const earnings = Number(ride.driver_earnings ?? 0);

      if (!current) {
        map.set(ride.driver_id, {
          driverId: ride.driver_id,
          driverName: driverNames[ride.driver_id] ?? "Conductor",
          rides: [ride],
          totalTrips: 1,
          totalBilled: billed,
          totalCommission: commission,
          totalDriverEarnings: earnings,
        });
        return;
      }

      current.rides.push(ride);
      current.totalTrips += 1;
      current.totalBilled += billed;
      current.totalCommission += commission;
      current.totalDriverEarnings += earnings;
    });

    return Array.from(map.values()).sort((a, b) => b.totalTrips - a.totalTrips);
  }, [filtered, driverNames]);

  const handleSettleDriver = async (driverId: string) => {
    const pendingIds = filtered
      .filter((ride) => ride.driver_id === driverId && !ride.is_settled)
      .map((ride) => ride.id);

    if (pendingIds.length === 0) return;

    setLoading(true);
    await onMarkSettled(pendingIds);
    setLoading(false);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <select value={selectedDriver} onChange={(event) => setSelectedDriver(event.target.value)} className="field">
          <option value="all">Todos los conductores</option>
          {Object.entries(driverNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="field" />
        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="field" />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={weekOnly}
            onChange={(event) => setWeekOnly(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Mostrar solo semana actual
        </label>
      </div>

      <div className="space-y-3">
        {grouped.map((row) => {
          const hasPending = row.rides.some((ride) => !ride.is_settled);
          return (
            <article key={row.driverId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{row.driverName}</h3>
                <SettlementStatusBadge settled={!hasPending} />
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-5">
                <p>Viajes: {row.totalTrips}</p>
                <p>Facturado: {formatCurrencyARS(row.totalBilled)}</p>
                <p>Comisión FueGo: {formatCurrencyARS(row.totalCommission)}</p>
                <p>Ganancia conductor: {formatCurrencyARS(row.totalDriverEarnings)}</p>
                <p>
                  Pendientes: {row.rides.filter((ride) => !ride.is_settled).length}
                </p>
              </div>

              <button
                onClick={() => handleSettleDriver(row.driverId)}
                disabled={!hasPending || loading}
                className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Marcar pendientes como liquidados"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

