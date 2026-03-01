import Link from "next/link";

import { AppShell } from "@/components/common/app-shell";
import { AffiliateAdminDashboard } from "@/components/admin/affiliate-admin-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { AffiliateEarning } from "@/lib/types";

export default async function AdminAffiliatesPage() {
  const { supabase } = await requireProfile("admin");

  const { data: affiliates } = await supabase
    .from("profiles")
    .select("id,full_name,affiliate_code")
    .eq("role", "affiliate")
    .order("created_at", { ascending: false });

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id,referred_by_affiliate_id")
    .eq("role", "driver");

  const { data: earnings } = await supabase
    .from("affiliate_earnings")
    .select("affiliate_id,affiliate_commission_amount");

  const rows = ((affiliates ?? []) as Array<{ id: string; full_name: string | null; affiliate_code: string | null }>).map(
    (affiliate) => {
      const referredDrivers = ((drivers ?? []) as Array<{ id: string; referred_by_affiliate_id: string | null }>).filter(
      (driver) => driver.referred_by_affiliate_id === affiliate.id,
      );
      const affiliateEarnings = ((earnings ?? []) as AffiliateEarning[]).filter((earning) => earning.affiliate_id === affiliate.id);

      return {
        id: affiliate.id,
        full_name: affiliate.full_name,
        affiliate_code: affiliate.affiliate_code ?? null,
        referred_drivers: referredDrivers.length,
        generated_rides: affiliateEarnings.length,
        total_generated: affiliateEarnings.reduce(
          (sum, earning) => sum + Number(earning.affiliate_commission_amount ?? 0),
          0,
        ),
      };
    },
  );

  return (
    <AppShell title="Afiliados" subtitle="Control de referidos y comisiones generadas." roleLabel="Admin">
      <div className="space-y-4">
        <Link href="/admin" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
          Volver al panel admin
        </Link>
        <AffiliateAdminDashboard affiliates={rows} />
      </div>
    </AppShell>
  );
}
