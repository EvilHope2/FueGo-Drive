import { AppShell } from "@/components/common/app-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

export default async function AdminPage() {
  const { supabase } = await requireProfile("admin");

  const { data: rides } = await supabase
    .from("rides")
    .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone),affiliate_profile:profiles!rides_affiliate_id_fkey(full_name,affiliate_code)")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Panel admin" subtitle="Vision global de viajes, clientes y conductores." roleLabel="Admin">
      <AdminDashboard initialRides={(rides ?? []) as Ride[]} />
    </AppShell>
  );
}

