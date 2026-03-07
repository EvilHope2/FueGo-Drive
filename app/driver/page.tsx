import { AppShell } from "@/components/common/app-shell";
import { PanelRoleSwitcher } from "@/components/common/panel-role-switcher";
import { DriverDashboard } from "@/components/driver/driver-dashboard";
import { requireProfile } from "@/lib/auth-server";
import type { DriverWalletTransaction, Profile, Ride } from "@/lib/types";
import { calculateDriverWalletBalance } from "@/lib/wallet";

export default async function DriverPage() {
  const { supabase, profile } = await requireProfile("driver");

  const { data: walletTransactions } = await supabase
    .from("driver_wallet_transactions")
    .select("amount,created_at")
    .eq("driver_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: activeRides } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", profile.id)
    .not("status", "in", "(Finalizado,Cancelado)")
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: recentRides } = await supabase
    .from("rides")
    .select("*")
    .eq("driver_id", profile.id)
    .in("status", ["Finalizado", "Cancelado"])
    .order("created_at", { ascending: false })
    .limit(8);

  const walletTx = (walletTransactions ?? []) as Pick<DriverWalletTransaction, "amount" | "created_at">[];
  const balance = Number(calculateDriverWalletBalance(walletTx.map((item) => Number(item.amount ?? 0))) ?? 0);
  const totalPayments = Number(
    walletTx
      .filter((item) => Number(item.amount ?? 0) > 0)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  );
  const latestMovementAt = walletTx[0]?.created_at ?? null;
  const walletLimitNegative = Number(profile.wallet_limit_negative ?? -20000);
  const isSuspended = profile.driver_account_status === "suspended_debt";
  const canAccessDriver = profile.role === "driver" || profile.is_driver === true;
  const canAccessAffiliate = profile.role === "affiliate" || profile.is_affiliate === true;

  return (
    <AppShell title="Panel conductor" subtitle="Acepta viajes y actualiza estados del servicio." roleLabel="Conductor">
      <PanelRoleSwitcher currentPanel="driver" canAccessDriver={canAccessDriver} canAccessAffiliate={canAccessAffiliate} />
      <DriverDashboard
        walletBalance={balance}
        walletLimitNegative={walletLimitNegative}
        isSuspended={isSuspended}
        totalPayments={totalPayments}
        latestMovementAt={latestMovementAt}
        activeRide={(activeRides?.[0] as Ride | undefined) ?? null}
        recentRides={(recentRides ?? []) as Ride[]}
        profile={profile as Profile}
      />
    </AppShell>
  );
}

