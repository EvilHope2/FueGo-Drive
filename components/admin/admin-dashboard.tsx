"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { RIDE_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Ride } from "@/lib/types";

type Props = {
  initialRides: Ride[];
};

export function AdminDashboard({ initialRides }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [filter, setFilter] = useState<string>("Todos");

  const cancelRide = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("rides").update({ status: "Cancelado" }).eq("id", id).select("*").single();
    if (data) {
      setRides((prev) => prev.map((ride) => (ride.id === id ? (data as Ride) : ride)));
    }
  };

  const visibleRides = rides.filter((ride) => filter === "Todos" || ride.status === filter);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {ride.origin} ? {ride.destination}
              </p>
              <StatusBadge status={ride.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
            <p className="mt-2 text-sm text-slate-700">Cliente: {ride.customer_name}</p>
            <p className="text-sm text-slate-700">WhatsApp: {ride.customer_phone}</p>
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
    </div>
  );
}
