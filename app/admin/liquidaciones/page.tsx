import { LiquidationsDashboard } from "@/components/admin/liquidations-dashboard";
import { AppShell } from "@/components/common/app-shell";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

export default async function AdminLiquidacionesPage() {
  const { supabase } = await requireProfile("admin");

  const { data: rides } = await supabase
    .from("rides")
    .select("*")
    .eq("status", "Finalizado")
    .order("finished_at", { ascending: false });

  const driverIds = Array.from(new Set((rides ?? []).map((ride) => ride.driver_id).filter(Boolean))) as string[];

  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    const { data: drivers } = await supabase.from("profiles").select("id,full_name").in("id", driverIds);
    driverNames = (drivers ?? []).reduce(
      (acc, driver) => {
        acc[driver.id] = driver.full_name ?? "Conductor";
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  return (
    <AppShell title="Liquidaciones" subtitle="Liquidación semanal simple por conductor." roleLabel="Admin">
      <LiquidationsDashboard initialRides={(rides ?? []) as Ride[]} driverNames={driverNames} />
    </AppShell>
  );
}
