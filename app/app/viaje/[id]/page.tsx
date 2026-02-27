import { notFound } from "next/navigation";

import { AppShell } from "@/components/common/app-shell";
import { CustomerRideDetail } from "@/components/customer/customer-ride-detail";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerRidePage({ params }: Props) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile("customer");

  const { data: ride } = await supabase
    .from("rides")
    .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone)")
    .eq("id", id)
    .eq("customer_id", profile.id)
    .single();

  if (!ride) notFound();

  return (
    <AppShell title="Detalle del viaje" subtitle="Seguimiento en tiempo real del estado actual." roleLabel="Cliente">
      <CustomerRideDetail rideId={id} initialRide={ride as Ride} />
    </AppShell>
  );
}

