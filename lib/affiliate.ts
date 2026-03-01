import type { Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeAffiliateCode(value: string) {
  return value.trim().toUpperCase();
}

export function buildAffiliateReferralLink(siteUrl: string, code: string) {
  return `${siteUrl.replace(/\/$/, "")}/registro-conductor?ref=${encodeURIComponent(code)}`;
}

export function getDriverAffiliate(driver: Pick<Profile, "referred_by_affiliate_id" | "referred_by_affiliate_code">) {
  return {
    affiliateId: driver.referred_by_affiliate_id ?? null,
    affiliateCode: driver.referred_by_affiliate_code ?? null,
    hasAffiliate: Boolean(driver.referred_by_affiliate_id),
  };
}

export async function getAffiliateFromRefCode(supabase: SupabaseClient, refCode: string) {
  const code = normalizeAffiliateCode(refCode);
  if (!code) return null;

  const { data, error } = await supabase.rpc("get_affiliate_from_ref_code", { p_code: code });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return row as { id: string; affiliate_code: string; full_name: string };
}
