import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

function hasRoleAccess(profile: Profile, role: Role) {
  if (role === "driver") return profile.role === "driver" || profile.is_driver === true;
  if (role === "affiliate") return profile.role === "affiliate" || profile.is_affiliate === true;
  return profile.role === role;
}

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

    const payload = {
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
    };

    const { error: insertError } = await supabase.from("profiles").insert(payload);
    if (insertError) {
      await supabase.from("profiles").insert({
        id: user.id,
        role: inferredRole,
        full_name: payload.full_name,
        phone: payload.phone,
      });
    }

    const { data: createdProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = createdProfile;
  }

  if (!profile) {
    redirect("/login");
  }

  const typedProfile = profile as Profile;

  if (expectedRole && !hasRoleAccess(typedProfile, expectedRole)) {
    if (hasRoleAccess(typedProfile, "admin")) redirect("/admin");
    if (hasRoleAccess(typedProfile, "driver")) redirect("/driver");
    if (hasRoleAccess(typedProfile, "affiliate")) redirect("/affiliate");
    if (hasRoleAccess(typedProfile, "customer")) redirect("/app");
    redirect("/login");
  }

  return { supabase, profile: typedProfile };
}
