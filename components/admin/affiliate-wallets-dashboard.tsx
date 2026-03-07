"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { MoneyCard } from "@/components/common/money-card";
import { logAdminAction } from "@/lib/admin-audit";
import { createClient } from "@/lib/supabase/client";
import type { AffiliateEarning } from "@/lib/types";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";

type AffiliateRow = {
  id: string;
  full_name: string | null;
  affiliate_code: string | null;
};

type Props = {
  affiliates: AffiliateRow[];
  earnings: AffiliateEarning[];
};

export function AffiliateWalletsDashboard({ affiliates, earnings }: Props) {
  const [rows, setRows] = useState(earnings);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>("all");
  const [savingAffiliateId, setSavingAffiliateId] = useState<string | null>(null);

  const summaries = useMemo(() => {
    return affiliates.map((affiliate) => {
      const list = rows.filter((item) => item.affiliate_id === affiliate.id);
      const totalGenerated = list.reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);
      const totalPending = list
        .filter((item) => item.payout_status !== "paid")
        .reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);
      const totalPaid = list
        .filter((item) => item.payout_status === "paid")
        .reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);

      return {
        ...affiliate,
        totalGenerated,
        totalPending,
        totalPaid,
        pendingCount: list.filter((item) => item.payout_status !== "paid").length,
        paidCount: list.filter((item) => item.payout_status === "paid").length,
      };
    });
  }, [affiliates, rows]);

  const visibleEarnings = useMemo(() => {
    return rows.filter((item) => (selectedAffiliateId === "all" ? true : item.affiliate_id === selectedAffiliateId));
  }, [rows, selectedAffiliateId]);

  const globalPending = useMemo(
    () => rows.filter((item) => item.payout_status !== "paid").reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0),
    [rows],
  );
  const globalPaid = useMemo(
    () => rows.filter((item) => item.payout_status === "paid").reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0),
    [rows],
  );

  const markAffiliatePendingAsPaid = async (affiliateId: string) => {
    const pendingIds = rows.filter((item) => item.affiliate_id === affiliateId && item.payout_status !== "paid").map((item) => item.id);
    if (pendingIds.length === 0) {
      toast.error("No hay comisiones pendientes para este afiliado.");
      return;
    }

    setSavingAffiliateId(affiliateId);
    const supabase = createClient();
    const paidAt = new Date().toISOString();
    const { error } = await supabase
      .from("affiliate_earnings")
      .update({ payout_status: "paid", paid_at: paidAt })
      .in("id", pendingIds);

    if (error) {
      toast.error("No se pudo registrar el pago.");
      setSavingAffiliateId(null);
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        pendingIds.includes(item.id)
          ? {
              ...item,
              payout_status: "paid",
              paid_at: paidAt,
            }
          : item,
      ),
    );

    const paidAmount = rows
      .filter((item) => pendingIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.affiliate_commission_amount ?? 0), 0);

    await logAdminAction({
      actionType: "affiliate_payout_marked_paid",
      entityType: "affiliate_earning",
      entityId: affiliateId,
      metadata: { paid_count: pendingIds.length, paid_amount: paidAmount },
    });

    toast.success("Pago registrado en wallet de afiliado.");
    setSavingAffiliateId(null);
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <MoneyCard label="Pendiente a pagar afiliados" value={formatCurrencyARS(globalPending)} />
        <MoneyCard label="Total pagado afiliados" value={formatCurrencyARS(globalPaid)} />
        <MoneyCard label="Registros de comisiones" value={String(rows.length)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Saldos por afiliado</h2>
          <select
            value={selectedAffiliateId}
            onChange={(event) => setSelectedAffiliateId(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Todos los afiliados</option>
            {affiliates.map((affiliate) => (
              <option key={affiliate.id} value={affiliate.id}>
                {affiliate.full_name ?? "Afiliado"} ({affiliate.affiliate_code ?? "-"})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {(selectedAffiliateId === "all"
            ? summaries
            : summaries.filter((item) => item.id === selectedAffiliateId)
          ).map((summary) => (
            <article key={summary.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{summary.full_name ?? "Afiliado"}</p>
                  <p className="mt-1 text-xs text-slate-500">Código: {summary.affiliate_code ?? "-"}</p>
                </div>
                <button
                  type="button"
                  disabled={savingAffiliateId === summary.id || summary.pendingCount === 0}
                  onClick={() => markAffiliatePendingAsPaid(summary.id)}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAffiliateId === summary.id ? "Guardando..." : "Registrar pago"}
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-4">
                <p>Pendiente: {formatCurrencyARS(summary.totalPending)}</p>
                <p>Pagado: {formatCurrencyARS(summary.totalPaid)}</p>
                <p>Total generado: {formatCurrencyARS(summary.totalGenerated)}</p>
                <p>Movimientos: {summary.pendingCount + summary.paidCount}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Historial de comisiones afiliados</h2>
        <div className="mt-4 space-y-2">
          {visibleEarnings.length === 0 ? (
            <EmptyState title="Sin movimientos" description="No hay registros para este filtro." />
          ) : (
            visibleEarnings.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.driver_profile?.full_name ?? "Conductor"} | {formatCurrencyARS(item.affiliate_commission_amount)}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.payout_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.payout_status === "paid" ? "Pagado" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Viaje #{item.ride_id.slice(0, 8)} | {formatDateTime(item.ride?.created_at ?? item.created_at)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Comisión afiliado: {Math.round(item.affiliate_commission_percent)}% | Monto viaje: {formatCurrencyARS(item.ride_amount)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
