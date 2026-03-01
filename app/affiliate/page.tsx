import { AppShell } from "@/components/common/app-shell";
import { AffiliateDashboard } from "@/components/affiliate/affiliate-dashboard";
import { buildAffiliateReferralLink } from "@/lib/affiliate";
import { requireProfile } from "@/lib/auth-server";
import type { AffiliateEarning } from "@/lib/types";

export default async function AffiliatePage() {
  const { supabase, profile } = await requireProfile("affiliate");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const affiliateCode = profile.affiliate_code ?? "SIN-CODIGO";
  const referralLink =
    profile.affiliate_referral_link ?? (affiliateCode !== "SIN-CODIGO" ? buildAffiliateReferralLink(siteUrl, affiliateCode) : "-");

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id,full_name,created_at")
    .eq("role", "driver")
    .eq("referred_by_affiliate_id", profile.id)
    .order("created_at", { ascending: false });

  const driverIds = (drivers ?? []).map((item) => item.id);

  const { data: earnings } = driverIds.length
    ? await supabase
        .from("affiliate_earnings")
        .select("*,driver_profile:profiles!affiliate_earnings_driver_id_fkey(full_name)")
        .eq("affiliate_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const earningsByDriver = new Map<string, { rides: number; total: number }>();
  for (const row of (earnings ?? []) as AffiliateEarning[]) {
    const current = earningsByDriver.get(row.driver_id) ?? { rides: 0, total: 0 };
    current.rides += 1;
    current.total += Number(row.affiliate_commission_amount ?? 0);
    earningsByDriver.set(row.driver_id, current);
  }

  const driverRows = ((drivers ?? []) as Array<{ id: string; full_name: string | null; created_at: string }>).map((driver) => {
    const summary = earningsByDriver.get(driver.id) ?? { rides: 0, total: 0 };
    return {
      ...driver,
      total_rides: summary.rides,
      total_generated: summary.total,
    };
  });

  return (
    <AppShell title="Panel afiliado" subtitle="Seguimiento de conductores referidos y ganancias." roleLabel="Afiliado">
      <AffiliateDashboard
        affiliateCode={affiliateCode}
        referralLink={referralLink}
        drivers={driverRows}
        earnings={(earnings ?? []) as AffiliateEarning[]}
      />
    </AppShell>
  );
}
