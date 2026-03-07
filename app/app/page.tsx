import { AppShell } from "@/components/common/app-shell";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { NeighborhoodSurcharge, Promotion, Ride, ZoneBasePrice } from "@/lib/types";

export default async function CustomerAppPage() {
  const { supabase, profile } = await requireProfile("customer");

  const { data: rides } = await supabase
    .from("rides")
    .select("*")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: basePrices } = await supabase.from("zone_base_prices").select("*");
  const { data: surcharges } = await supabase.from("neighborhood_surcharges").select("*");
  const { data: promotions } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("discount_percent", { ascending: false });

  return (
    <AppShell title="Panel cliente" subtitle="Solicita, segui y gestiona tus viajes en FueGo." roleLabel="Cliente">
      <CustomerDashboard
        profile={profile}
        initialRides={(rides ?? []) as Ride[]}
        basePrices={(basePrices ?? []) as ZoneBasePrice[]}
        surcharges={(surcharges ?? []) as NeighborhoodSurcharge[]}
        promotions={(promotions ?? []) as Promotion[]}
      />
    </AppShell>
  );
}

