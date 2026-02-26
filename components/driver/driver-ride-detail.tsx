"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { StatusStepper } from "@/components/common/status-stepper";
import { WhatsAppFixedButton } from "@/components/common/whatsapp-fixed-button";
import { WHATSAPP_MESSAGE, type RideStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Ride } from "@/lib/types";

type Props = {
  rideId: string;
  initialRide: Ride;
};

const transitions: { label: string; status: RideStatus; tone?: "danger" }[] = [
  { label: "En camino", status: "En camino" },
  { label: "Llegando", status: "Llegando" },
  { label: "Afuera", status: "Afuera" },
  { label: "Finalizar", status: "Finalizado" },
  { label: "Cancelar", status: "Cancelado", tone: "danger" },
];

export function DriverRideDetail({ rideId, initialRide }: Props) {
  const [ride, setRide] = useState(initialRide);
  const [loadingStatus, setLoadingStatus] = useState<RideStatus | null>(null);

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
    const supabase = createClient();

    const { data } = await supabase
      .from("rides")
      .update({ status })
      .eq("id", ride.id)
      .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
      .single();

    if (data) {
      setRide(data as Ride);
    }

    setLoadingStatus(null);
  };

  const customerPhone = ride.customer_phone;
  const customerName = ride.customer_name;
  const whatsappHref = useMemo(() => buildWhatsAppLink(customerPhone, WHATSAPP_MESSAGE), [customerPhone]);

  return (
    <div className="space-y-5 pb-24">
      <Link href="/driver" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        ? Volver
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Viaje asignado</h2>
          <StatusBadge status={ride.status} />
        </div>
        <p className="mt-1 text-sm text-slate-700">
          {ride.origin} ? {ride.destination}
        </p>
        <p className="mt-1 text-xs text-slate-500">Creado: {formatDateTime(ride.created_at)}</p>

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <p>Cliente: {customerName}</p>
          <p>WhatsApp cliente: {customerPhone}</p>
          {ride.note ? <p>Nota: {ride.note}</p> : null}
        </div>

        <div className="mt-5">
          <StatusStepper status={ride.status} />
        </div>
      </section>

      {ride.status !== "Finalizado" && ride.status !== "Cancelado" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Actualizar estado</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {transitions.map((item) => (
              <button
                key={item.status}
                onClick={() => updateStatus(item.status)}
                disabled={loadingStatus === item.status || ride.status === item.status}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  item.tone === "danger"
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {loadingStatus === item.status ? "Actualizando..." : item.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {ride.status === "Afuera" ? <WhatsAppFixedButton href={whatsappHref} label="Avisar por WhatsApp" /> : null}
    </div>
  );
}
