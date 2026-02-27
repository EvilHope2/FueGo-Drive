"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { StatusStepper } from "@/components/common/status-stepper";
import { WhatsAppFixedButton } from "@/components/common/whatsapp-fixed-button";
import { NEXT_DRIVER_STATUS, WHATSAPP_MESSAGE, type RideStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Ride } from "@/lib/types";

type Props = {
  rideId: string;
  initialRide: Ride;
};

export function DriverRideDetail({ rideId, initialRide }: Props) {
  const [ride, setRide] = useState(initialRide);
  const [loadingStatus, setLoadingStatus] = useState<RideStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchRide = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
        .eq("id", rideId)
        .single();

      if (data) {
        setRide(data as Ride);
      }
    };

    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [rideId]);

  const updateStatus = async (status: RideStatus) => {
    setLoadingStatus(status);
    setError(null);
    const supabase = createClient();

    const { data, error: updateError } = await supabase
      .from("rides")
      .update({ status })
      .eq("id", ride.id)
      .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
      .single();

    if (updateError) {
      if (updateError.message.includes("INVALID_STATUS_FLOW")) {
        setError("El estado debe avanzar en orden.");
      } else if (updateError.message.includes("STATUS_LOCKED")) {
        setError("El viaje ya no permite cambios de estado.");
      } else {
        setError("No se pudo actualizar el estado.");
      }
      setLoadingStatus(null);
      return;
    }

    if (data) {
      setRide(data as Ride);
    }

    setLoadingStatus(null);
  };

  const customerPhone = ride.customer_phone;
  const customerName = ride.customer_name;
  const whatsappHref = useMemo(() => buildWhatsAppLink(customerPhone, WHATSAPP_MESSAGE), [customerPhone]);

  const isLocked = ride.status === "Finalizado" || ride.status === "Cancelado";
  const nextStatus = NEXT_DRIVER_STATUS[ride.status] ?? null;

  return (
    <div className="space-y-5 pb-24">
      <Link href="/driver" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al panel
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Viaje asignado</h2>
          <StatusBadge status={ride.status} />
        </div>
        <p className="mt-1 text-sm text-slate-700">
          {ride.origin} {"->"} {ride.destination}
        </p>
        <p className="mt-1 text-xs text-slate-500">Creado: {formatDateTime(ride.created_at)}</p>

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>Cliente: {customerName}</p>
          <p>WhatsApp cliente: {customerPhone}</p>
          <p>
            Barrios: {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
          </p>
          <p>
            Zonas: {ride.from_zone ?? "-"} {"->"} {ride.to_zone ?? "-"}
          </p>
          <p className="font-semibold text-slate-900">Estimado: {formatCurrency(ride.estimated_price ?? null)}</p>
          {ride.note ? <p>Nota: {ride.note}</p> : null}
        </div>

        <div className="mt-5">
          <StatusStepper status={ride.status} />
        </div>
      </section>

      {!isLocked ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Actualizar estado</h3>
          <p className="mt-1 text-sm text-slate-600">El flujo avanza en orden: Aceptado, En camino, Llegando, Afuera y Finalizado.</p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {nextStatus ? (
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={loadingStatus === nextStatus}
                className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loadingStatus === nextStatus ? "Actualizando..." : nextStatus}
              </button>
            ) : null}

            <button
              onClick={() => updateStatus("Cancelado")}
              disabled={loadingStatus === "Cancelado"}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {loadingStatus === "Cancelado" ? "Actualizando..." : "Cancelar"}
            </button>
          </div>

          {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </section>
      ) : null}

      {ride.status === "Afuera" ? <WhatsAppFixedButton href={whatsappHref} label="Avisar por WhatsApp" /> : null}
    </div>
  );
}
