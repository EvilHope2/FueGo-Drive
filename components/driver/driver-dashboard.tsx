"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { DriverVehicleCard } from "@/components/common/driver-vehicle-card";
import { PaymentMethodBadge } from "@/components/common/payment-method-badge";
import { RidePriceSummary } from "@/components/common/ride-price-summary";
import { StatusBadge } from "@/components/common/status-badge";
import { DriverTutorialCard } from "@/components/driver/driver-tutorial-card";
import { PushNotificationBanner } from "@/components/driver/push-notification-banner";
import { DebtSuspensionAlert } from "@/components/wallet/debt-suspension-alert";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { Profile, Ride } from "@/lib/types";
import { shouldSuspendDriver } from "@/lib/wallet";

type Props = {
  driverId: string;
  initialAvailable: Ride[];
  initialActive: Ride[];
  walletBalance: number;
  walletLimitNegative: number;
  isSuspended: boolean;
  pendingCommission: number;
  totalPayments: number;
  latestMovementAt: string | null;
  profile: Profile;
};

export function DriverDashboard({
  driverId,
  initialAvailable,
  initialActive,
  walletBalance,
  walletLimitNegative,
  isSuspended,
  pendingCommission,
  totalPayments,
  latestMovementAt,
  profile,
}: Props) {
  const router = useRouter();
  const [availableRides, setAvailableRides] = useState(initialAvailable);
  const [activeRides, setActiveRides] = useState(initialActive);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [newRideIds, setNewRideIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const blockedByDebt = isSuspended || shouldSuspendDriver(walletBalance, walletLimitNegative);
  const commissionAlias = "Fuegodriver";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
  const paidCommissionMessage = "ya pague mi comision de FueGo te adjunto el comprobante de pago";
  const paidCommissionHref = buildWhatsAppLink(supportPhone, paidCommissionMessage);
  const knownRideIdsRef = useRef<Set<string>>(new Set(initialAvailable.map((ride) => ride.id)));

  useEffect(() => {
    const onInteract = () => setHasInteracted(true);
    window.addEventListener("click", onInteract, { once: true });
    window.addEventListener("touchstart", onInteract, { once: true });
    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("touchstart", onInteract);
    };
  }, []);

  useEffect(() => {
    const playNewRideSound = () => {
      if (!soundEnabled || !hasInteracted) return;
      try {
        const audioContext = new window.AudioContext();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.24);
        void audioContext.close();
      } catch {
        // ignore audio errors in restricted browsers
      }
    };

    const supabase = createClient();
    const channel = supabase
      .channel(`driver-rides-${driverId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides" },
        (payload) => {
          const ride = payload.new as Ride;
          if (ride.status !== "Solicitado" || ride.driver_id) return;
          if (knownRideIdsRef.current.has(ride.id)) return;

          knownRideIdsRef.current.add(ride.id);
          setAvailableRides((prev) => [ride, ...prev]);
          setNewRideIds((prev) => {
            const next = new Set(prev);
            next.add(ride.id);
            return next;
          });
          playNewRideSound();
          toast.success("Nueva solicitud disponible.");
          setTimeout(() => {
            setNewRideIds((prev) => {
              const next = new Set(prev);
              next.delete(ride.id);
              return next;
            });
          }, 9000);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const ride = payload.new as Ride;
          setAvailableRides((prev) => {
            const withoutCurrent = prev.filter((item) => item.id !== ride.id);
            if (ride.status === "Solicitado" && !ride.driver_id) {
              return [ride, ...withoutCurrent];
            }
            return withoutCurrent;
          });

          if (ride.driver_id === driverId && !["Finalizado", "Cancelado"].includes(ride.status)) {
            setActiveRides((prev) => [ride, ...prev.filter((item) => item.id !== ride.id)]);
          }
          if (ride.driver_id === driverId && ["Finalizado", "Cancelado"].includes(ride.status)) {
            setActiveRides((prev) => prev.filter((item) => item.id !== ride.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, hasInteracted, soundEnabled]);

  const reloadAvailable = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("rides")
      .select("*")
      .is("driver_id", null)
      .eq("status", "Solicitado")
      .order("created_at", { ascending: false });

    setAvailableRides((data ?? []) as Ride[]);
  };

  const acceptRide = async (rideId: string) => {
    if (blockedByDebt) {
      toast.error(`Deuda ${formatCurrencyARS(Math.abs(walletBalance))}. Pagar a este alias: fuegodriver (titular Nahuel Ramos)`);
      return;
    }

    setAcceptingId(rideId);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("accept_ride", { p_ride_id: rideId });

    if (rpcError) {
      if (rpcError.message.includes("RIDE_NOT_AVAILABLE")) {
        toast.error("Otro conductor ya tomó este viaje.");
      } else if (rpcError.message.includes("DRIVER_SUSPENDED_DEBT")) {
        toast.error(`Deuda ${formatCurrencyARS(Math.abs(walletBalance))}. Pagar a este alias: fuegodriver (titular Nahuel Ramos)`);
      } else {
        toast.error("No se pudo aceptar el viaje.");
      }
      await reloadAvailable();
      setAcceptingId(null);
      return;
    }

    const accepted = data as Ride;
    setAvailableRides((prev) => prev.filter((ride) => ride.id !== rideId));
    setActiveRides((prev) => [accepted, ...prev.filter((ride) => ride.id !== accepted.id)]);
    setAcceptingId(null);
    toast.success("Viaje aceptado.");
    router.push(`/driver/viaje/${accepted.id}`);
  };

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
        >
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            Sonido de alertas: {soundEnabled ? "activado" : "desactivado"}
          </button>
        </WalletSummaryCard>
      </section>
      <DriverVehicleCard
        title="Mi vehículo"
        fullName={profile.full_name}
        phone={profile.phone}
        vehiclePlate={profile.vehicle_plate}
        vehicleBrand={profile.vehicle_brand}
        vehicleModelYear={profile.vehicle_model_year}
      />
      <div className="flex justify-end">
        <div className="flex gap-2">
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
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Viajes disponibles</h2>
          <div className="mt-4 space-y-3">
            {availableRides.length === 0 ? (
              <EmptyState title="Sin viajes solicitados" description="Volvé a revisar en unos segundos." />
            ) : (
              availableRides.map((ride) => (
                <article
                  key={ride.id}
                  className={`rounded-xl border p-4 transition ${
                    newRideIds.has(ride.id) ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"
                  }`}
                >
                  {newRideIds.has(ride.id) ? (
                    <span className="mb-2 inline-flex rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      Nuevo
                    </span>
                  ) : null}
                  <p className="text-sm font-semibold text-slate-900">
                    {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                    <span>Pago:</span>
                    <PaymentMethodBadge method={ride.payment_method} />
                  </div>
                  <div className="mt-2">
                    <RidePriceSummary
                      estimatedPrice={ride.estimated_price}
                      commissionAmount={ride.commission_amount}
                      driverEarnings={ride.driver_earnings}
                      commissionPercent={ride.commission_percent}
                      showBreakdown
                    />
                  </div>
                  <button
                    onClick={() => acceptRide(ride.id)}
                    disabled={acceptingId === ride.id || blockedByDebt}
                    className="mt-3 w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {blockedByDebt ? "Bloqueado por deuda" : acceptingId === ride.id ? "Aceptando..." : "Aceptar"}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mi viaje activo</h2>
          <div className="mt-4 space-y-3">
            {activeRides.length === 0 ? (
              <EmptyState title="No tenés viajes activos" description="Cuando aceptes uno aparece en esta sección." />
            ) : (
              activeRides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                    </p>
                    <StatusBadge status={ride.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                    <span>Pago:</span>
                    <PaymentMethodBadge method={ride.payment_method} />
                  </div>
                  <div className="mt-2">
                    <RidePriceSummary
                      estimatedPrice={ride.estimated_price}
                      commissionAmount={ride.commission_amount}
                      driverEarnings={ride.driver_earnings}
                      commissionPercent={ride.commission_percent}
                      showBreakdown
                    />
                  </div>
                  <Link
                    href={`/driver/viaje/${ride.id}`}
                    className="mt-3 inline-flex text-sm font-medium text-indigo-700 transition hover:text-indigo-800"
                  >
                    Ver detalle
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
