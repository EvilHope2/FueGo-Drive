import { AppShell } from "@/components/common/app-shell";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { AdminActionLog, Ride } from "@/lib/types";

export default async function AdminPage() {
  const { supabase } = await requireProfile("admin");

  const { data: rides } = await supabase
    .from("rides")
    .select("*,driver_profile:profiles!rides_driver_id_fkey(full_name,phone),affiliate_profile:profiles!rides_affiliate_id_fkey(full_name,affiliate_code)")
    .order("created_at", { ascending: false });

  const { count: suspendedDrivers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .or("role.eq.driver,is_driver.eq.true")
    .eq("driver_account_status", "suspended_debt");

  const { count: pendingAffiliatePayouts } = await supabase
    .from("affiliate_earnings")
    .select("*", { count: "exact", head: true })
    .eq("payout_status", "pending");

  const { data: actionLogs } = await supabase
    .from("admin_action_logs")
    .select("*,admin_profile:profiles!admin_action_logs_admin_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <AppShell title="Panel admin" subtitle="Vision global de viajes, clientes y conductores." roleLabel="Admin">
      <AdminDashboard
        initialRides={(rides ?? []) as Ride[]}
        suspendedDrivers={suspendedDrivers ?? 0}
        pendingAffiliatePayouts={pendingAffiliatePayouts ?? 0}
        actionLogs={(actionLogs ?? []) as AdminActionLog[]}
      />
    </AppShell>
  );
}

