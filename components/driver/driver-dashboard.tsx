"use client";

import Link from "next/link";
import { toast } from "sonner";

import { DriverVehicleCard } from "@/components/common/driver-vehicle-card";
import { StatusBadge } from "@/components/common/status-badge";
import { DriverTutorialCard } from "@/components/driver/driver-tutorial-card";
import { PushNotificationBanner } from "@/components/driver/push-notification-banner";
import { DebtSuspensionAlert } from "@/components/wallet/debt-suspension-alert";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import type { Profile, Ride } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { shouldSuspendDriver } from "@/lib/wallet";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Props = {
  walletBalance: number;
  walletLimitNegative: number;
  isSuspended: boolean;
  pendingCommission: number;
  totalPayments: number;
  latestMovementAt: string | null;
  activeRide: Ride | null;
  recentRides: Ride[];
  profile: Profile;
};

export function DriverDashboard({
  walletBalance,
  walletLimitNegative,
  isSuspended,
  pendingCommission,
  totalPayments,
  latestMovementAt,
  activeRide,
  recentRides,
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
          caption={latestMovementAt ? `Ultimo movimiento: ${formatDateTime(latestMovementAt)}` : "Sin movimientos"}
        />
      </section>

      {activeRide ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Tenes un viaje en curso</p>
              <p className="mt-1 text-sm text-indigo-800">
                {activeRide.origin_address ?? activeRide.origin} {"->"} {activeRide.destination_address ?? activeRide.destination}
              </p>
            </div>
            <StatusBadge status={activeRide.status} />
          </div>
          <Link
            href={`/driver/viaje/${activeRide.id}`}
            className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Continuar viaje
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Historial reciente</h3>
        <div className="mt-3 space-y-2">
          {recentRides.length === 0 ? (
            <p className="text-sm text-slate-600">Todavia no tenes viajes finalizados o cancelados.</p>
          ) : (
            recentRides.map((ride) => (
              <article key={ride.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                  </p>
                  <StatusBadge status={ride.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <DriverVehicleCard
        title="Mi vehiculo"
        fullName={profile.full_name}
        phone={profile.phone}
        vehiclePlate={profile.vehicle_plate}
        vehicleBrand={profile.vehicle_brand}
        vehicleModelYear={profile.vehicle_model_year}
      />
    </div>
  );
}
