import type { Metadata } from "next";

import { HomeFinalCta } from "@/components/home/home-final-cta";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeForAffiliates } from "@/components/home/home-for-affiliates";
import { HomeForDrivers } from "@/components/home/home-for-drivers";
import { HomeHero } from "@/components/home/home-hero";
import { HomeHowItWorks } from "@/components/home/home-how-it-works";
import { HomeNavbar } from "@/components/home/home-navbar";
import { HomeSafety } from "@/components/home/home-safety";
import { HomeStats } from "@/components/home/home-stats";
import { ROLE_PATHS } from "@/lib/constants";
import { getHomeCounters } from "@/lib/home-stats";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "FueGo | Pedi tu viaje en segundos",
  description: "FueGo conecta clientes, conductores y afiliados en una plataforma de movilidad simple, rapida y confiable.",
  openGraph: {
    title: "FueGo | Pedi tu viaje en segundos",
    description: "Viajes simples y rapidos con seguimiento claro del estado del chofer.",
    type: "website",
  },
};

export const revalidate = 300;

async function getPrimaryCtaHref() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role as Role | undefined) ?? "customer";
  return ROLE_PATHS[role] ?? "/login";
}

export default async function HomePage() {
  const [{ totalDrivers, totalCustomers, totalCompletedRides }, primaryHref] = await Promise.all([
    getHomeCounters(),
    getPrimaryCtaHref(),
  ]);

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
  const supportHref = supportPhone ? buildWhatsAppLink(supportPhone, "Hola, necesito ayuda con FueGo") : "/login";

  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <HomeNavbar primaryHref={primaryHref} supportHref={supportHref} />
      <HomeHero primaryHref={primaryHref} />
      <HomeHowItWorks primaryHref={primaryHref} />
      <HomeSafety />
      <HomeForDrivers />
      <HomeForAffiliates />
      <HomeStats totalDrivers={totalDrivers} totalCustomers={totalCustomers} totalCompletedRides={totalCompletedRides} />
      <HomeFinalCta primaryHref={primaryHref} />
      <HomeFooter supportHref={supportHref} />
    </main>
  );
}
