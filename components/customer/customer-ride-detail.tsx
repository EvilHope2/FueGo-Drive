"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { StatusStepper } from "@/components/common/status-stepper";
import { WhatsAppFixedButton } from "@/components/common/whatsapp-fixed-button";
import { WHATSAPP_MESSAGE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Ride } from "@/lib/types";

type Props = {
  rideId: string;
  initialRide: Ride;
};

export function CustomerRideDetail({ rideId, initialRide }: Props) {
  const [ride, setRide] = useState(initialRide);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const fetchRide = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone)")
        .eq("id", rideId)
        .single();

      if (data) {
        setRide(data as Ride);
      }
    };

    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [rideId]);

  const driverPhone = ride.driver_profile?.phone ?? "";
  const driverName = ride.driver_profile?.full_name ?? "Conductor asignado";
  const whatsappHref = useMemo(() => buildWhatsAppLink(driverPhone, WHATSAPP_MESSAGE), [driverPhone]);

  const cancelRide = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("rides")
      .update({ status: "Cancelado" })
      .eq("id", ride.id)
      .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone)")
      .single();

    if (data) setRide(data as Ride);
    setLoading(false);
  };

  return (
    <div className="space-y-5 pb-24">
      <Link href="/app" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        ? Volver
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Detalle del viaje</h2>
          <StatusBadge status={ride.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {ride.origin} ? {ride.destination}
        </p>
        <p className="mt-1 text-xs text-slate-500">Solicitado: {formatDateTime(ride.created_at)}</p>

        <div className="mt-5">
          <StatusStepper status={ride.status} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Conductor</h3>
        {ride.driver_id ? (
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>{driverName}</p>
            <p>WhatsApp: {driverPhone || "Sin telefono"}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Todavia no hay conductor asignado.</p>
        )}
      </section>

      {(ride.status === "Solicitado" || ride.status === "Aceptado") && (
        <button
          type="button"
          disabled={loading}
          onClick={cancelRide}
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-70"
        >
          {loading ? "Cancelando..." : "Cancelar viaje"}
        </button>
      )}

      {ride.driver_id && driverPhone ? <WhatsAppFixedButton href={whatsappHref} label="Contactar por WhatsApp" /> : null}
    </div>
  );
}
