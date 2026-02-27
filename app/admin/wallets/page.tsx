import { AppShell } from "@/components/common/app-shell";
import { AdminWalletPage } from "@/components/wallet/admin-wallet-page";
import { requireProfile } from "@/lib/auth-server";
import type { DriverWalletTransaction } from "@/lib/types";

export default async function AdminWalletsRoute() {
  const { supabase } = await requireProfile("admin");

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id,full_name,driver_account_status,wallet_limit_negative")
    .eq("role", "driver")
    .order("created_at", { ascending: false });

  const { data: transactions } = await supabase
    .from("driver_wallet_transactions")
    .select("*")
    .order("created_at", { ascending: false });

  const mappedDrivers = (drivers ?? []).map((driver) => ({
    id: driver.id,
    full_name: driver.full_name ?? "Conductor",
    driver_account_status: (driver.driver_account_status ?? "active") as "active" | "suspended_debt",
    wallet_limit_negative: Number(driver.wallet_limit_negative ?? -20000),
  }));

  return (
    <AppShell title="Wallets" subtitle="Control de deuda y pagos de conductores." roleLabel="Admin">
      <AdminWalletPage drivers={mappedDrivers} transactions={(transactions ?? []) as DriverWalletTransaction[]} />
    </AppShell>
  );
}
