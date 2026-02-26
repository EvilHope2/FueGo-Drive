"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Ride } from "@/lib/types";

type Props = {
  driverId: string;
  initialAvailable: Ride[];
  initialActive: Ride[];
};

export function DriverDashboard({ driverId, initialAvailable, initialActive }: Props) {
  const [availableRides, setAvailableRides] = useState(initialAvailable);
  const [activeRides, setActiveRides] = useState(initialActive);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const acceptRide = async (rideId: string) => {
    setAcceptingId(rideId);

    const supabase = createClient();
    const { data } = await supabase
      .from("rides")
      .update({ status: "Aceptado", driver_id: driverId })
      .eq("id", rideId)
      .is("driver_id", null)
      .eq("status", "Solicitado")
      .select("*")
      .single();

    if (data) {
      const accepted = data as Ride;
      setAvailableRides((prev) => prev.filter((ride) => ride.id !== rideId));
      setActiveRides((prev) => [accepted, ...prev]);
    }

    setAcceptingId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Viajes disponibles</h2>
        <div className="mt-4 space-y-3">
          {availableRides.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No hay viajes solicitados por ahora
            </p>
          ) : (
            availableRides.map((ride) => (
              <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {ride.origin} ? {ride.destination}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                <button
                  onClick={() => acceptRide(ride.id)}
                  disabled={acceptingId === ride.id}
                  className="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
                >
                  {acceptingId === ride.id ? "Aceptando..." : "Aceptar"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mis viajes activos</h2>
        <div className="mt-4 space-y-3">
          {activeRides.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No tenes viajes activos
            </p>
          ) : (
            activeRides.map((ride) => (
              <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {ride.origin} ? {ride.destination}
                  </p>
                  <StatusBadge status={ride.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                <Link
                  href={`/driver/viaje/${ride.id}`}
                  className="mt-3 inline-flex text-sm font-medium text-indigo-700 transition hover:text-indigo-800"
                >
                  Ver detalle
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
