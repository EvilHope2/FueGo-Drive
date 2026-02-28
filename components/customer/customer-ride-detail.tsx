"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RidePriceSummary } from "@/components/common/ride-price-summary";
import { RideStepper } from "@/components/common/ride-stepper";
import { StatusBadge } from "@/components/common/status-badge";
import { DriverVehicleCard } from "@/components/common/driver-vehicle-card";
import { PaymentMethodBadge } from "@/components/common/payment-method-badge";
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
        .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone,vehicle_plate,vehicle_brand,vehicle_model_year)")
        .eq("id", rideId)
        .single();

      if (data) setRide(data as Ride);
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
    const { data, error } = await supabase
      .from("rides")
      .update({ status: "Cancelado" })
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
      toast.success("Viaje cancelado.");
    }

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

        <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            Barrios: {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
          </p>
          <p>
            Zonas: {ride.from_zone ?? "-"} {"->"} {ride.to_zone ?? "-"}
          </p>
          <div className="flex items-center gap-2">
            <span>Método de pago:</span>
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
          <p className="mt-3 text-sm text-slate-600">Todavía no hay conductor asignado.</p>
        </section>
      )}

      {canCancel ? (
        <button
          type="button"
          disabled={loading}
          onClick={cancelRide}
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-70"
        >
          {loading ? "Cancelando..." : "Cancelar viaje"}
        </button>
      ) : null}

      {ride.driver_id && driverPhone ? <WhatsAppFixedButton href={whatsappHref} label="Contactar conductor" /> : null}
    </div>
  );
}

