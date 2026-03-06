import { AppShell } from "@/components/common/app-shell";
import { DriverActiveRidesScreen } from "@/components/driver/driver-active-rides-screen";
import { requireProfile } from "@/lib/auth-server";
import type { DriverWalletTransaction, Ride } from "@/lib/types";
import { calculateDriverWalletBalance } from "@/lib/wallet";

export default async function DriverActiveRidesPage() {
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
    .select("amount")
    .eq("driver_id", profile.id);

  const walletTx = (walletTransactions ?? []) as Pick<DriverWalletTransaction, "amount">[];
  const walletBalance = Number(calculateDriverWalletBalance(walletTx.map((item) => Number(item.amount ?? 0))) ?? 0);
  const walletLimitNegative = Number(profile.wallet_limit_negative ?? -20000);
  const isSuspended = profile.driver_account_status === "suspended_debt";

  return (
    <AppShell title="Viajes activos" subtitle="Solicitudes disponibles y tu viaje en curso." roleLabel="Conductor">
      <DriverActiveRidesScreen
        driverId={profile.id}
        initialAvailable={(availableRides ?? []) as Ride[]}
        initialActive={(activeRides ?? []) as Ride[]}
        walletBalance={walletBalance}
        walletLimitNegative={walletLimitNegative}
        isSuspended={isSuspended}
      />
    </AppShell>
  );
}
