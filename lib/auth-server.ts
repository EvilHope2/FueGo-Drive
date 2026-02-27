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
      metadataRole === "driver" || metadataRole === "admin" ? metadataRole : "customer";

    await supabase.from("profiles").insert({
      id: user.id,
      role: inferredRole,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
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
  }

  return { supabase, profile: typedProfile };
}
