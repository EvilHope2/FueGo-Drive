import { AppShell } from "@/components/common/app-shell";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { Ride } from "@/lib/types";

export default async function CustomerAppPage() {
  const { supabase, profile } = await requireProfile("customer");

  const { data: rides } = await supabase
    .from("rides")
    .select("*")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Panel cliente" subtitle="Solicita, segui y gestiona tus viajes en FueGo.">
      <CustomerDashboard profile={profile} initialRides={(rides ?? []) as Ride[]} />
    </AppShell>
  );
}
