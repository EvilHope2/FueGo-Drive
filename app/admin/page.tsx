import { AppShell } from "@/components/common/app-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

export default async function AdminPage() {
  const { supabase } = await requireProfile("admin");

  const { data: rides } = await supabase.from("rides").select("*").order("created_at", { ascending: false });

  return (
    <AppShell title="Panel admin" subtitle="Vision global de viajes, clientes y conductores.">
      <AdminDashboard initialRides={(rides ?? []) as Ride[]} />
    </AppShell>
  );
}
