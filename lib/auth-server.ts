import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function requireProfile(expectedRole?: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    const metadataRole = user.user_metadata?.role;
    const inferredRole: Role =
      metadataRole === "driver" || metadataRole === "admin" || metadataRole === "affiliate" ? metadataRole : "customer";

    await supabase.from("profiles").insert({
      id: user.id,
      role: inferredRole,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Usuario",
      email: user.email ?? null,
      phone: (user.user_metadata?.phone as string | undefined) ?? "",
      affiliate_code: (user.user_metadata?.affiliate_code as string | undefined) ?? null,
      affiliate_referral_link: (user.user_metadata?.affiliate_referral_link as string | undefined) ?? null,
      referred_by_affiliate_id: (user.user_metadata?.referred_by_affiliate_id as string | undefined) ?? null,
      referred_by_affiliate_code: (user.user_metadata?.referred_by_affiliate_code as string | undefined) ?? null,
      vehicle_plate: (user.user_metadata?.vehicle_plate as string | undefined) ?? null,
      vehicle_brand: (user.user_metadata?.vehicle_brand as string | undefined) ?? null,
      vehicle_model_year: (user.user_metadata?.vehicle_model_year as string | undefined) ?? null,
    });

    const { data: createdProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = createdProfile;
  }

  if (!profile) {
    redirect("/login");
  }

  const typedProfile = profile as Profile;

  if (expectedRole && typedProfile.role !== expectedRole) {
    if (typedProfile.role === "customer") redirect("/app");
    if (typedProfile.role === "driver") redirect("/driver");
    if (typedProfile.role === "admin") redirect("/admin");
    if (typedProfile.role === "affiliate") redirect("/affiliate");
  }

  return { supabase, profile: typedProfile };
}
