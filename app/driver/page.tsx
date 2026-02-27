import { AppShell } from "@/components/common/app-shell";
import { DriverDashboard } from "@/components/driver/driver-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { DriverWalletTransaction, Ride } from "@/lib/types";
import { calculateDriverWalletBalance } from "@/lib/wallet";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile("driver");

  const { data: availableRides } = await supabase
    .from("rides")
    .select("*")
    .is("driver_id", null)
    .eq("status", "Solicitado")
    .order("created_at", { ascending: false });

  const { data: activeRides } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", profile.id)
    .not("status", "in", "(Finalizado,Cancelado)")
    .order("created_at", { ascending: false });

  const { data: walletTransactions } = await supabase
    .from("driver_wallet_transactions")
    .select("amount,created_at")
    .eq("driver_id", profile.id)
    .order("created_at", { ascending: false });

  const walletTx = (walletTransactions ?? []) as Pick<DriverWalletTransaction, "amount" | "created_at">[];
  const balance = Number(calculateDriverWalletBalance(walletTx.map((item) => Number(item.amount ?? 0))) ?? 0);
  const pendingCommission = Number(
    walletTx
      .filter((item) => Number(item.amount ?? 0) < 0)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  );
  const totalPayments = Number(
    walletTx
      .filter((item) => Number(item.amount ?? 0) > 0)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  );
  const latestMovementAt = walletTx[0]?.created_at ?? null;
  const walletLimitNegative = Number(profile.wallet_limit_negative ?? -20000);
  const isSuspended = profile.driver_account_status === "suspended_debt";

  return (
    <AppShell title="Panel conductor" subtitle="Acepta viajes y actualiza estados del servicio." roleLabel="Conductor">
      <DriverDashboard
        initialAvailable={(availableRides ?? []) as Ride[]}
        initialActive={(activeRides ?? []) as Ride[]}
        walletBalance={balance}
        walletLimitNegative={walletLimitNegative}
        isSuspended={isSuspended}
        pendingCommission={pendingCommission}
        totalPayments={totalPayments}
        latestMovementAt={latestMovementAt}
      />
    </AppShell>
  );
}

