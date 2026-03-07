import Link from "next/link";

import { AffiliateWalletsDashboard } from "@/components/admin/affiliate-wallets-dashboard";
import { AppShell } from "@/components/common/app-shell";
import { requireProfile } from "@/lib/auth-server";
import type { AffiliateEarning, Profile } from "@/lib/types";

type AffiliateRow = {
  id: string;
  full_name: string | null;
  affiliate_code: string | null;
};

export default async function AdminAffiliateWalletsPage() {
  const { supabase } = await requireProfile("admin");

  const { data: affiliates } = await supabase
    .from("profiles")
    .select("id,full_name,affiliate_code")
    .or("role.eq.affiliate,is_affiliate.eq.true")
    .order("created_at", { ascending: false });

  const { data: earnings } = await supabase
    .from("affiliate_earnings")
    .select("*")
    .order("created_at", { ascending: false });

  const affiliateRows = (affiliates ?? []) as AffiliateRow[];
  const earningsRows = (earnings ?? []) as AffiliateEarning[];

  const driverIds = Array.from(new Set(earningsRows.map((row) => row.driver_id).filter(Boolean)));
  let driversById: Record<string, string> = {};
  if (driverIds.length > 0) {
    const { data: drivers } = await supabase.from("profiles").select("id,full_name").in("id", driverIds);
    driversById = ((drivers ?? []) as Array<Pick<Profile, "id" | "full_name">>).reduce(
      (acc, row) => {
        acc[row.id] = row.full_name ?? "Conductor";
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  const rideIds = Array.from(new Set(earningsRows.map((row) => row.ride_id).filter(Boolean)));
  let ridesById: Record<string, string> = {};
  if (rideIds.length > 0) {
    const { data: rides } = await supabase.from("rides").select("id,created_at").in("id", rideIds);
    ridesById = ((rides ?? []) as Array<{ id: string; created_at: string }>).reduce(
      (acc, row) => {
        acc[row.id] = row.created_at;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  const mappedEarnings = earningsRows.map((row) => ({
    ...row,
    driver_profile: { full_name: driversById[row.driver_id] ?? "Conductor" },
    ride: { id: row.ride_id, created_at: ridesById[row.ride_id] ?? row.created_at, status: "Finalizado" as const },
  }));

  return (
    <AppShell title="Wallets afiliados" subtitle="Control de saldo pendiente y pagos a afiliados." roleLabel="Admin">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
            Volver al panel admin
          </Link>
          <Link href="/admin/afiliados" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
            Volver a afiliados
          </Link>
        </div>
        <AffiliateWalletsDashboard affiliates={affiliateRows} earnings={mappedEarnings} />
      </div>
    </AppShell>
  );
}
