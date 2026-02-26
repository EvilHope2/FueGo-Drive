import { AppShell } from "@/components/common/app-shell";
import { DriverDashboard } from "@/components/driver/driver-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile("driver");

  const { data: availableRides } = await supabase
    .from("rides")
    .select("*")
    .is("driver_id", null)
    .eq("status", "Solicitado")
    .order("created_at", { ascending: false });

  const { data: activeRides } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", profile.id)
    .not("status", "in", "(Finalizado,Cancelado)")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Panel conductor" subtitle="Acepta viajes y actualiza estados del servicio.">
      <DriverDashboard
        driverId={profile.id}
        initialAvailable={(availableRides ?? []) as Ride[]}
        initialActive={(activeRides ?? []) as Ride[]}
      />
    </AppShell>
  );
}
