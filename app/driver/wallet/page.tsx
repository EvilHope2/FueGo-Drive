import { AppShell } from "@/components/common/app-shell";
import { DriverWalletPage } from "@/components/wallet/driver-wallet-page";
import { requireProfile } from "@/lib/auth-server";
import type { DriverWalletTransaction, Profile } from "@/lib/types";
import { calculateDriverWalletBalance } from "@/lib/wallet";

export default async function DriverWalletRoute() {
  const { supabase, profile } = await requireProfile("driver");

  const { data: transactions } = await supabase
    .from("driver_wallet_transactions")
    .select("*")
    .eq("driver_id", profile.id)
    .order("created_at", { ascending: false });

  const tx = (transactions ?? []) as DriverWalletTransaction[];
  const balance = Number(calculateDriverWalletBalance(tx.map((item) => Number(item.amount ?? 0))) ?? 0);
  const pendingCommission = Number(
    tx
      .filter((item) => Number(item.amount ?? 0) < 0)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  );
  const totalPayments = Number(
    tx
      .filter((item) => Number(item.amount ?? 0) > 0)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  );

  const profileWithStatus = profile as Profile;

  return (
    <AppShell title="Wallet" subtitle="Cuenta corriente con FueGo." roleLabel="Conductor">
      <DriverWalletPage
        balance={balance}
        pendingCommission={pendingCommission}
        totalPayments={totalPayments}
        lastTransaction={tx[0] ?? null}
        transactions={tx}
        isSuspended={profileWithStatus.driver_account_status === "suspended_debt"}
      />
    </AppShell>
  );
}
