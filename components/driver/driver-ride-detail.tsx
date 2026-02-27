"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RidePriceSummary } from "@/components/common/ride-price-summary";
import { RideStepper } from "@/components/common/ride-stepper";
import { StatusBadge } from "@/components/common/status-badge";
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

const driverActions: { label: string; status: RideStatus; tone?: "danger" }[] = [
  { label: "En camino", status: "En camino" },
  { label: "Llegando", status: "Llegando" },
  { label: "Afuera", status: "Afuera" },
  { label: "Finalizar", status: "Finalizado" },
  { label: "Cancelar", status: "Cancelado", tone: "danger" },
];

export function DriverRideDetail({ rideId, initialRide }: Props) {
  const [ride, setRide] = useState(initialRide);
  const [loadingStatus, setLoadingStatus] = useState<RideStatus | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(ride.payment_method ?? "unknown");

  useEffect(() => {
    const supabase = createClient();

    const fetchRide = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
        .eq("id", rideId)
        .single();

      if (data) {
        const nextRide = data as Ride;
        setRide(nextRide);
        setPaymentMethod(nextRide.payment_method ?? "unknown");
      }
    };

    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [rideId]);

  const updateStatus = async (status: RideStatus) => {
    if (status === "Finalizado" && paymentMethod === "unknown") {
      toast.error("Seleccioná cómo cobraste el viaje antes de finalizar.");
      return;
    }

    setLoadingStatus(status);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("rides")
      .update({ status, payment_method: paymentMethod })
      .eq("id", ride.id)
      .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
      .single();

    if (error) {
      if (error.message.includes("INVALID_STATUS_FLOW")) {
        toast.error("Debes avanzar los estados en orden.");
      } else if (error.message.includes("STATUS_LOCKED")) {
        toast.error("Este viaje ya no permite cambios.");
      } else {
        toast.error("No se pudo actualizar el estado.");
      }
      setLoadingStatus(null);
      return;
    }

    if (data) {
      const nextRide = data as Ride;
      setRide(nextRide);
      setPaymentMethod(nextRide.payment_method ?? paymentMethod);
      toast.success("Estado actualizado.");
    }

    setLoadingStatus(null);
  };

  const isLocked = ride.status === "Finalizado" || ride.status === "Cancelado";
  const customerPhone = ride.customer_phone;
  const whatsappHref = useMemo(() => buildWhatsAppLink(customerPhone, WHATSAPP_MESSAGE), [customerPhone]);

  return (
    <div className="space-y-5 pb-24">
      <Link href="/driver" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al panel
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Detalle del viaje</h2>
          <StatusBadge status={ride.status} />
        </div>

        <p className="mt-1 text-sm text-slate-700">
          {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
        </p>
        <p className="mt-1 text-xs text-slate-500">Creado: {formatDateTime(ride.created_at)}</p>

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>Cliente: {ride.customer_name}</p>
          <p>WhatsApp: {ride.customer_phone}</p>
          <p>
            Barrios: {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
          </p>
          <p>
            Zonas: {ride.from_zone ?? "-"} {"->"} {ride.to_zone ?? "-"}
          </p>
          {ride.note ? <p>Nota: {ride.note}</p> : null}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Método de cobro</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as Ride["payment_method"])}
              className="field"
            >
              <option value="unknown">Desconocido</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="platform">Plataforma</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <RidePriceSummary
            estimatedPrice={ride.estimated_price}
            commissionAmount={ride.commission_amount}
            driverEarnings={ride.driver_earnings}
            commissionPercent={ride.commission_percent}
            showBreakdown
          />
        </div>

        <div className="mt-5">
          <RideStepper status={ride.status} />
        </div>
      </section>

      {!isLocked ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Actualizar estado</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {driverActions.map((action) => (
              <button
                key={action.status}
                onClick={() => updateStatus(action.status)}
                disabled={loadingStatus === action.status || ride.status === action.status}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  action.tone === "danger"
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {loadingStatus === action.status ? "Actualizando..." : action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {ride.status === "Afuera" ? <WhatsAppFixedButton href={whatsappHref} label="Avisar por WhatsApp" /> : null}
    </div>
  );
}

