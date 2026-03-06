"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DriverVehicleCard } from "@/components/common/driver-vehicle-card";
import { PaymentMethodBadge } from "@/components/common/payment-method-badge";
import { RidePriceSummary } from "@/components/common/ride-price-summary";
import { RideStepper } from "@/components/common/ride-stepper";
import { StatusBadge } from "@/components/common/status-badge";
import { WhatsAppFixedButton } from "@/components/common/whatsapp-fixed-button";
import { WHATSAPP_MESSAGE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Ride } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Props = {
  rideId: string;
  initialRide: Ride;
};

function getStatusHint(status: Ride["status"]) {
  if (status === "Solicitado") return "Estamos buscando un conductor para tu viaje.";
  if (status === "Aceptado") return "Conductor asignado. En breve se pone en camino.";
  if (status === "En camino") return "Tu conductor esta en camino al punto de origen.";
  if (status === "Llegando") return "Tu conductor esta cerca.";
  if (status === "Afuera") return "Tu FueGo ya llego al punto de encuentro.";
  if (status === "Finalizado") return "Viaje finalizado. Gracias por usar FueGo.";
  return "Viaje cancelado.";
}

export function CustomerRideDetail({ rideId, initialRide }: Props) {
  const [ride, setRide] = useState(initialRide);
  const [loading, setLoading] = useState(false);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const previousStatusRef = useRef<Ride["status"]>(initialRide.status);

  useEffect(() => {
    const supabase = createClient();

    const fetchRide = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone,vehicle_plate,vehicle_brand,vehicle_model_year)")
        .eq("id", rideId)
        .single();

      if (!data) return;

      const nextRide = data as Ride;
      if (previousStatusRef.current !== nextRide.status) {
        const message =
          nextRide.status === "En camino"
            ? "Tu conductor esta en camino."
            : nextRide.status === "Llegando"
              ? "Tu conductor esta llegando."
              : nextRide.status === "Afuera"
                ? "Tu FueGo esta afuera."
                : `Estado actualizado: ${nextRide.status}`;
        toast.info(message);
      }

      previousStatusRef.current = nextRide.status;
      setRide(nextRide);
    };

    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, [rideId]);

  const canCancel = ride.status === "Solicitado" || ride.status === "Aceptado";
  const driverPhone = ride.driver_profile?.phone ?? "";
  const whatsappHref = useMemo(() => buildWhatsAppLink(driverPhone, WHATSAPP_MESSAGE), [driverPhone]);

  const cancelRide = async () => {
    setLoading(true);
    const supabase = createClient();

    const reasonText = cancelReason.trim();
    const nextNote = reasonText
      ? `${ride.note ? `${ride.note}\n` : ""}[Cancelado por cliente] ${reasonText}`
      : ride.note ?? null;

    const { data, error } = await supabase
      .from("rides")
      .update({ status: "Cancelado", note: nextNote })
      .eq("id", ride.id)
      .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone,vehicle_plate,vehicle_brand,vehicle_model_year)")
      .single();

    if (error) {
      toast.error("No se pudo cancelar el viaje.");
      setLoading(false);
      return;
    }

    if (data) {
      setRide(data as Ride);
      previousStatusRef.current = "Cancelado";
      toast.success("Viaje cancelado.");
    }

    setShowCancelReason(false);
    setCancelReason("");
    setLoading(false);
  };

  return (
    <div className="space-y-5 pb-24">
      <Link href="/app" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al panel
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Detalle del viaje</h2>
          <StatusBadge status={ride.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
        </p>
        <p className="mt-1 text-xs text-slate-500">Solicitado: {formatDateTime(ride.created_at)}</p>

        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          {getStatusHint(ride.status)}
        </div>

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            Barrios: {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
          </p>
          <p>
            Zonas: {ride.from_zone ?? "-"} {"->"} {ride.to_zone ?? "-"}
          </p>
          <div className="flex items-center gap-2">
            <span>Metodo de pago:</span>
            <PaymentMethodBadge method={ride.payment_method} />
          </div>
        </div>

        <div className="mt-3">
          <RidePriceSummary estimatedPrice={ride.estimated_price} />
        </div>

        <div className="mt-5">
          <RideStepper status={ride.status} />
        </div>
      </section>

      {ride.driver_id ? (
        <DriverVehicleCard
          title="Tu conductor"
          fullName={ride.driver_profile?.full_name}
          phone={driverPhone}
          vehiclePlate={ride.driver_profile?.vehicle_plate}
          vehicleBrand={ride.driver_profile?.vehicle_brand}
          vehicleModelYear={ride.driver_profile?.vehicle_model_year}
        />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Conductor</h3>
          <p className="mt-3 text-sm text-slate-600">Todavia no hay conductor asignado.</p>
        </section>
      )}

      {canCancel ? (
        <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          {!showCancelReason ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowCancelReason(true)}
              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-70"
            >
              Cancelar viaje
            </button>
          ) : (
            <>
              <p className="text-sm font-semibold text-rose-800">Motivo de cancelacion (opcional)</p>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="field"
                placeholder="Ej: cambie de plan"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelRide}
                  disabled={loading}
                  className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-70"
                >
                  {loading ? "Cancelando..." : "Confirmar cancelacion"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelReason(false);
                    setCancelReason("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  Volver
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {ride.driver_id && driverPhone ? <WhatsAppFixedButton href={whatsappHref} label="Contactar conductor" /> : null}
    </div>
  );
}
