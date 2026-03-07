import Link from "next/link";

import { AdminPromotionsDashboard } from "@/components/admin/admin-promotions-dashboard";
import { AppShell } from "@/components/common/app-shell";
import { requireProfile } from "@/lib/auth-server";
import type { Profile, Promotion, PromotionRedemption } from "@/lib/types";

export default async function AdminPromotionsPage() {
  const { supabase } = await requireProfile("admin");

  const { data: promotions, error: promotionsError } = await supabase
    .from("promotions")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: redemptions, error: redemptionsError } = await supabase
    .from("promotion_redemptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  const customerIds = Array.from(new Set((redemptions ?? []).map((row) => row.customer_id).filter(Boolean))) as string[];
  let customersById: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase.from("profiles").select("id,full_name").in("id", customerIds);
    customersById = ((customers ?? []) as Array<Pick<Profile, "id" | "full_name">>).reduce(
      (acc, row) => {
        acc[row.id] = row.full_name ?? "Cliente";
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  const promotionsById = ((promotions ?? []) as Promotion[]).reduce(
    (acc, row) => {
      acc[row.id] = row.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  const mappedRedemptions = ((redemptions ?? []) as PromotionRedemption[]).map((row) => ({
    ...row,
    promotion_name: promotionsById[row.promotion_id] ?? "Promoción",
    customer_name: customersById[row.customer_id] ?? "Cliente",
  }));

  const hasSchemaError =
    promotionsError?.message?.includes("does not exist") || redemptionsError?.message?.includes("does not exist");

  return (
    <AppShell title="Promociones" subtitle="Gestión centralizada de descuentos y uso en viajes." roleLabel="Admin">
      <div className="space-y-4">
        <Link href="/admin" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
          Volver al panel admin
        </Link>
        <AdminPromotionsDashboard
          initialPromotions={(promotions ?? []) as Promotion[]}
          initialRedemptions={mappedRedemptions}
          hasSchemaError={Boolean(hasSchemaError)}
        />
      </div>
    </AppShell>
  );
}
