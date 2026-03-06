"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { MoneyCard } from "@/components/common/money-card";
import { PaymentMethodBadge } from "@/components/common/payment-method-badge";
import { SettlementStatusBadge } from "@/components/common/settlement-status-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { RIDE_STATUSES } from "@/lib/constants";
import { logAdminAction } from "@/lib/admin-audit";
import { createClient } from "@/lib/supabase/client";
import type { AdminActionLog, Ride } from "@/lib/types";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";

type Props = {
  initialRides: Ride[];
  suspendedDrivers: number;
  pendingAffiliatePayouts: number;
  actionLogs: AdminActionLog[];
};

export function AdminDashboard({ initialRides, suspendedDrivers, pendingAffiliatePayouts, actionLogs }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [paymentFilter, setPaymentFilter] = useState<string>("Todos");
  const [query, setQuery] = useState<string>("");

  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const finalizedWeek = rides.filter((ride) => ride.status === "Finalizado" && new Date(ride.created_at) >= weekStart);

    const totalBilled = rides.reduce((sum, ride) => sum + Number(ride.estimated_price ?? 0), 0);
    const totalCommission = rides.reduce((sum, ride) => sum + Number(ride.admin_commission_amount ?? ride.commission_amount ?? 0), 0);
    const totalAffiliate = rides.reduce((sum, ride) => sum + Number(ride.affiliate_commission_amount ?? 0), 0);
    const totalDriverPay = rides.reduce((sum, ride) => sum + Number(ride.driver_earnings ?? 0), 0);

    return {
      totalTrips: rides.length,
      finalizedWeek: finalizedWeek.length,
      totalBilled,
      totalCommission,
      totalAffiliate,
      totalDriverPay,
    };
  }, [rides]);

  const quickMetrics = useMemo(() => {
    const requested = rides.filter((ride) => ride.status === "Solicitado").length;
    const inProgress = rides.filter((ride) => ["Aceptado", "En camino", "Llegando", "Afuera"].includes(ride.status)).length;
    const canceled = rides.filter((ride) => ride.status === "Cancelado").length;
    const unsettledFinalized = rides.filter((ride) => ride.status === "Finalizado" && !ride.is_settled).length;
    return { requested, inProgress, canceled, unsettledFinalized };
  }, [rides]);

  const cancelRide = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("rides").update({ status: "Cancelado" }).eq("id", id).select("*").single();
    if (data) {
      setRides((prev) => prev.map((ride) => (ride.id === id ? ({ ...ride, ...(data as Ride) } as Ride) : ride)));
      await logAdminAction({
        actionType: "ride_cancelled",
        entityType: "ride",
        entityId: id,
        metadata: { status: "Cancelado" },
      });
    }
  };

  const visibleRides = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rides.filter((ride) => {
      if (statusFilter !== "Todos" && ride.status !== statusFilter) return false;
      if (paymentFilter !== "Todos" && ride.payment_method !== paymentFilter) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        ride.customer_name,
        ride.customer_phone,
        ride.origin_address ?? ride.origin,
        ride.destination_address ?? ride.destination,
        ride.from_neighborhood,
        ride.to_neighborhood,
        ride.driver_profile?.full_name,
        ride.affiliate_profile?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [rides, statusFilter, paymentFilter, query]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Resumen operativo</h2>
            <p className="mt-1 text-sm text-slate-600">Vision rapida de viajes, comisiones y estado general de la operacion.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">Solicitados</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{quickMetrics.requested}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">En curso</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{quickMetrics.inProgress}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">Cancelados</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{quickMetrics.canceled}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">Liquidacion pendiente</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{quickMetrics.unsettledFinalized}</p>
            </article>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MoneyCard label="Viajes totales" value={String(metrics.totalTrips)} />
          <MoneyCard label="Finalizados (7 dias)" value={String(metrics.finalizedWeek)} />
          <MoneyCard label="Total facturado" value={formatCurrencyARS(metrics.totalBilled)} />
          <MoneyCard label="Comision FueGo" value={formatCurrencyARS(metrics.totalCommission)} />
          <MoneyCard label="Comision afiliados" value={formatCurrencyARS(metrics.totalAffiliate)} />
          <MoneyCard label="A pagar conductores" value={formatCurrencyARS(metrics.totalDriverPay)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/liquidaciones"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Ir a liquidaciones
          </Link>
          <Link
            href="/admin/wallets"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Ir a wallets
          </Link>
          <Link
            href="/admin/afiliados"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Ir a afiliados
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Alertas operativas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Sin tomar</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{quickMetrics.requested}</p>
            <button
              type="button"
              onClick={() => setStatusFilter("Solicitado")}
              className="mt-2 text-sm font-semibold text-amber-800 underline-offset-2 hover:underline"
            >
              Ver viajes solicitados
            </button>
          </article>
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Conductores suspendidos</p>
            <p className="mt-1 text-2xl font-semibold text-rose-900">{suspendedDrivers}</p>
            <Link href="/admin/wallets" className="mt-2 inline-flex text-sm font-semibold text-rose-800 hover:underline">
              Revisar wallets
            </Link>
          </article>
          <article className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Pagos afiliados pendientes</p>
            <p className="mt-1 text-2xl font-semibold text-sky-900">{pendingAffiliatePayouts}</p>
            <Link href="/admin/afiliados" className="mt-2 inline-flex text-sm font-semibold text-sky-800 hover:underline">
              Revisar afiliados
            </Link>
          </article>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Centro de viajes</h2>
            <p className="text-sm text-slate-600">Filtra y gestiona viajes activos, finalizados y cancelados.</p>
          </div>
          <p className="text-sm text-slate-600">
            Mostrando <span className="font-semibold text-slate-900">{visibleRides.length}</span> viaje(s)
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, chofer, barrio o direccion"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 xl:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="Todos">Todos los estados</option>
            {RIDE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="Todos">Todos los pagos</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>

        <div className="space-y-3">
          {visibleRides.length === 0 ? (
            <EmptyState title="No hay viajes para este filtro" description="Proba con otro estado, pago o busqueda." />
          ) : (
            visibleRides.map((ride) => (
              <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {ride.origin_address ?? ride.origin} {"->"} {ride.destination_address ?? ride.destination}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SettlementStatusBadge settled={Boolean(ride.is_settled)} />
                    <StatusBadge status={ride.status} />
                    <PaymentMethodBadge method={ride.payment_method} />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
                  <p>Cliente: {ride.customer_name}</p>
                  <p>Conductor: {ride.driver_profile?.full_name ?? "Sin asignar"}</p>
                  <p>Afiliado: {ride.affiliate_profile?.full_name ?? "Sin afiliado"}</p>
                  <p>Estimado: {formatCurrencyARS(ride.estimated_price ?? null)}</p>
                  <p>Comision afiliado: {formatCurrencyARS(ride.affiliate_commission_amount ?? 0)}</p>
                  <p>Comision FueGo: {formatCurrencyARS(ride.admin_commission_amount ?? ride.commission_amount ?? null)}</p>
                  <p>Ganancia conductor: {formatCurrencyARS(ride.driver_earnings ?? null)}</p>
                  <p>Liquidacion: {ride.is_settled ? "Liquidado" : "Pendiente"}</p>
                </div>

                {ride.status !== "Finalizado" && ride.status !== "Cancelado" ? (
                  <button
                    onClick={() => cancelRide(ride.id)}
                    className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Cancelar viaje
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Auditoria admin</h2>
        <div className="mt-4 space-y-2">
          {actionLogs.length === 0 ? (
            <EmptyState title="Sin acciones registradas" description="Cuando se registren acciones admin aparecen aca." />
          ) : (
            actionLogs.map((log) => (
              <article key={log.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {log.action_type} | {log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 8)}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Admin: {log.admin_profile?.full_name ?? log.admin_id}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
