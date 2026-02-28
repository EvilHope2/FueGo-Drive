import { notFound } from "next/navigation";

import { AppShell } from "@/components/common/app-shell";
import { DriverRideDetail } from "@/components/driver/driver-ride-detail";
import { requireProfile } from "@/lib/auth-server";
import type { Profile, Ride } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DriverRidePage({ params }: Props) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile("driver");

  const { data: ride } = await supabase
    .from("rides")
    .select("*,customer_profile:profiles!rides_customer_id_fkey(full_name,phone)")
    .eq("id", id)
    .eq("driver_id", profile.id)
    .single();

  if (!ride) notFound();

  return (
    <AppShell title="Gestion del viaje" subtitle="Actualiza el estado y comunica llegada al cliente." roleLabel="Conductor">
      <DriverRideDetail rideId={id} initialRide={ride as Ride} driverProfile={profile as Profile} />
    </AppShell>
  );
}

