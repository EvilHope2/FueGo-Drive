"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { RidePriceSummary } from "@/components/common/ride-price-summary";
import { StatusBadge } from "@/components/common/status-badge";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Ride } from "@/lib/types";

type Props = {
  initialAvailable: Ride[];
  initialActive: Ride[];
};

export function DriverDashboard({ initialAvailable, initialActive }: Props) {
  const router = useRouter();
  const [availableRides, setAvailableRides] = useState(initialAvailable);
  const [activeRides, setActiveRides] = useState(initialActive);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const reloadAvailable = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("rides")
      .select("*")
      .is("driver_id", null)
      .eq("status", "Solicitado")
      .order("created_at", { ascending: false });

    setAvailableRides((data ?? []) as Ride[]);
  };

  const acceptRide = async (rideId: string) => {
    setAcceptingId(rideId);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("accept_ride", { p_ride_id: rideId });

    if (rpcError) {
      if (rpcError.message.includes("RIDE_NOT_AVAILABLE")) {
        toast.error("Otro conductor ya tomó este viaje.");
      } else {
        toast.error("No se pudo aceptar el viaje.");
      }
      await reloadAvailable();
      setAcceptingId(null);
      return;
    }

    const accepted = data as Ride;
    setAvailableRides((prev) => prev.filter((ride) => ride.id !== rideId));
    setActiveRides((prev) => [accepted, ...prev.filter((ride) => ride.id !== accepted.id)]);
    setAcceptingId(null);
    toast.success("Viaje aceptado.");
    router.push(`/driver/viaje/${accepted.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Viajes disponibles</h2>
          <div className="mt-4 space-y-3">
            {availableRides.length === 0 ? (
              <EmptyState title="Sin viajes solicitados" description="Volvé a revisar en unos segundos." />
            ) : (
              availableRides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <div className="mt-2">
                    <RidePriceSummary
                      estimatedPrice={ride.estimated_price}
                      commissionAmount={ride.commission_amount}
                      driverEarnings={ride.driver_earnings}
                      commissionPercent={ride.commission_percent}
                      showBreakdown
                    />
                  </div>
                  <button
                    onClick={() => acceptRide(ride.id)}
                    disabled={acceptingId === ride.id}
                    className="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {acceptingId === ride.id ? "Aceptando..." : "Aceptar"}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mi viaje activo</h2>
          <div className="mt-4 space-y-3">
            {activeRides.length === 0 ? (
              <EmptyState title="No tenés viajes activos" description="Cuando aceptes uno aparece en esta sección." />
            ) : (
              activeRides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                    </p>
                    <StatusBadge status={ride.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <div className="mt-2">
                    <RidePriceSummary
                      estimatedPrice={ride.estimated_price}
                      commissionAmount={ride.commission_amount}
                      driverEarnings={ride.driver_earnings}
                      commissionPercent={ride.commission_percent}
                      showBreakdown
                    />
                  </div>
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
    </div>
  );
}

