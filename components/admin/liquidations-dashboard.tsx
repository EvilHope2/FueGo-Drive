"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DriverSettlementTable } from "@/components/admin/driver-settlement-table";
import { MoneyCard } from "@/components/common/money-card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyARS } from "@/lib/utils";
import type { Ride } from "@/lib/types";

type Props = {
  initialRides: Ride[];
  driverNames: Record<string, string>;
};

export function LiquidationsDashboard({ initialRides, driverNames }: Props) {
  const [rides, setRides] = useState(initialRides);

  const summary = useMemo(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 7);

    const weekFinalized = rides.filter((ride) => new Date(ride.finished_at ?? ride.created_at) >= startWeek);

    const totals = weekFinalized.reduce(
      (acc, ride) => {
        acc.totalBilled += Number(ride.estimated_price ?? 0);
        acc.totalCommission += Number(ride.admin_commission_amount ?? ride.commission_amount ?? 0);
        acc.totalDriver += Number(ride.driver_earnings ?? 0);
        if (!ride.is_settled) acc.pending += 1;
        return acc;
      },
      { totalBilled: 0, totalCommission: 0, totalDriver: 0, pending: 0 },
    );

    return {
      trips: weekFinalized.length,
      ...totals,
    };
  }, [rides]);

  const markSettled = async (rideIds: string[]) => {
    if (rideIds.length === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("rides")
      .update({ is_settled: true, settled_at: new Date().toISOString() })
      .in("id", rideIds);

    if (error) {
      toast.error("No se pudieron liquidar los viajes.");
      return;
    }

    setRides((prev) =>
      prev.map((ride) =>
        rideIds.includes(ride.id)
          ? { ...ride, is_settled: true, settled_at: new Date().toISOString() }
          : ride,
      ),
    );
    toast.success("Liquidación guardada.");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/admin/wallets"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Ir a wallets
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MoneyCard label="Finalizados (7 días)" value={String(summary.trips)} />
        <MoneyCard label="Total facturado" value={formatCurrencyARS(summary.totalBilled)} />
        <MoneyCard label="Comisión FueGo" value={formatCurrencyARS(summary.totalCommission)} />
        <MoneyCard label="A pagar conductores" value={formatCurrencyARS(summary.totalDriver)} />
      </div>

      <DriverSettlementTable rides={rides} driverNames={driverNames} onMarkSettled={markSettled} />
    </div>
  );
}
