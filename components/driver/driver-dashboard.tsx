"use client";

import Link from "next/link";
import { toast } from "sonner";

import { DriverVehicleCard } from "@/components/common/driver-vehicle-card";
import { DriverTutorialCard } from "@/components/driver/driver-tutorial-card";
import { PushNotificationBanner } from "@/components/driver/push-notification-banner";
import { DebtSuspensionAlert } from "@/components/wallet/debt-suspension-alert";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Profile } from "@/lib/types";
import { shouldSuspendDriver } from "@/lib/wallet";

type Props = {
  walletBalance: number;
  walletLimitNegative: number;
  isSuspended: boolean;
  pendingCommission: number;
  totalPayments: number;
  latestMovementAt: string | null;
  profile: Profile;
};

export function DriverDashboard({
  walletBalance,
  walletLimitNegative,
  isSuspended,
  pendingCommission,
  totalPayments,
  latestMovementAt,
  profile,
}: Props) {
  const blockedByDebt = isSuspended || shouldSuspendDriver(walletBalance, walletLimitNegative);
  const commissionAlias = "Fuegodriver";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
  const paidCommissionMessage = "ya pague mi comision de FueGo te adjunto el comprobante de pago";
  const paidCommissionHref = buildWhatsAppLink(supportPhone, paidCommissionMessage);

  const copyCommissionAlias = async () => {
    try {
      await navigator.clipboard.writeText(commissionAlias);
      toast.success("Alias copiado.");
    } catch {
      toast.error("No se pudo copiar el alias.");
    }
  };

  return (
    <div className="space-y-6">
      <DriverTutorialCard />
      <PushNotificationBanner />
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href="/driver/viajes-activos"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Viajes activos
        </Link>
        <Link
          href="/driver/perfil"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Mi perfil
        </Link>
        <Link
          href="/driver/wallet"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          Ver wallet
        </Link>
      </div>
      {blockedByDebt ? <DebtSuspensionAlert balance={walletBalance} /> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <WalletSummaryCard title="Saldo actual" value={walletBalance} />
        <WalletSummaryCard title="Comisiones pendientes" value={pendingCommission}>
          <button
            type="button"
            onClick={copyCommissionAlias}
            className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Pagar comision
          </button>
          <p className="mt-2 text-xs text-slate-600">Alias: {commissionAlias} | Titular: Nahuel David Ramos</p>
          <a
            href={paidCommissionHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-full justify-center rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Avisar pago de comision
          </a>
        </WalletSummaryCard>
        <WalletSummaryCard
          title="Pagos registrados"
          value={totalPayments}
          caption={latestMovementAt ? `Último movimiento: ${formatDateTime(latestMovementAt)}` : "Sin movimientos"}
        />
      </section>

      <DriverVehicleCard
        title="Mi vehículo"
        fullName={profile.full_name}
        phone={profile.phone}
        vehiclePlate={profile.vehicle_plate}
        vehicleBrand={profile.vehicle_brand}
        vehicleModelYear={profile.vehicle_model_year}
      />
    </div>
  );
}
