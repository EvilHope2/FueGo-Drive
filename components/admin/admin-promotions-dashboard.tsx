"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { MoneyCard } from "@/components/common/money-card";
import { createClient } from "@/lib/supabase/client";
import type { Promotion, PromotionRedemption } from "@/lib/types";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";

type Props = {
  initialPromotions: Promotion[];
  initialRedemptions: PromotionRedemption[];
  hasSchemaError: boolean;
};

type PromotionForm = {
  id?: string;
  name: string;
  discountPercent: string;
  maxDiscountAmount: string;
  startsAt: string;
  endsAt: string;
  maxUsesTotal: string;
  message: string;
  isActive: boolean;
};

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function asNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const num = Number(value.trim().replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function toForm(promo?: Promotion | null): PromotionForm {
  return {
    id: promo?.id,
    name: promo?.name ?? "",
    discountPercent: promo ? String(promo.discount_percent ?? 0) : "",
    maxDiscountAmount: promo?.max_discount_amount == null ? "" : String(promo.max_discount_amount),
    startsAt: toDatetimeLocal(promo?.starts_at),
    endsAt: toDatetimeLocal(promo?.ends_at),
    maxUsesTotal: promo?.max_uses_total == null ? "" : String(promo.max_uses_total),
    message: promo?.message ?? "",
    isActive: promo?.is_active ?? false,
  };
}

export function AdminPromotionsDashboard({ initialPromotions, initialRedemptions, hasSchemaError }: Props) {
  const [tab, setTab] = useState<"first" | "general" | "history">("first");
  const [promotions, setPromotions] = useState(initialPromotions);
  const [saving, setSaving] = useState(false);
  const [editingGeneral, setEditingGeneral] = useState<PromotionForm | null>(null);
  const [generalStatusFilter, setGeneralStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [historyPromotionFilter, setHistoryPromotionFilter] = useState("all");
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState("");

  const firstRidePromotion = useMemo(() => promotions.find((item) => item.type === "first_ride") ?? null, [promotions]);
  const [firstRideForm, setFirstRideForm] = useState<PromotionForm>(toForm(firstRidePromotion));
  const firstRideRedemptions = useMemo(() => {
    if (!firstRidePromotion) return [];
    return initialRedemptions.filter((item) => item.promotion_id === firstRidePromotion.id);
  }, [initialRedemptions, firstRidePromotion]);

  const generalPromotions = useMemo(() => promotions.filter((item) => item.type === "general"), [promotions]);
  const visibleGeneralPromotions = useMemo(() => {
    if (generalStatusFilter === "active") return generalPromotions.filter((item) => item.is_active);
    if (generalStatusFilter === "inactive") return generalPromotions.filter((item) => !item.is_active);
    return generalPromotions;
  }, [generalPromotions, generalStatusFilter]);
  const filteredHistory = useMemo(() => {
    return initialRedemptions.filter((item) => {
      if (historyPromotionFilter !== "all" && item.promotion_id !== historyPromotionFilter) return false;
      if (historyCustomerFilter.trim()) {
        const query = historyCustomerFilter.trim().toLowerCase();
        const name = (item.customer_name ?? "").toLowerCase();
        const id = item.customer_id.toLowerCase();
        if (!name.includes(query) && !id.includes(query)) return false;
      }
      return true;
    });
  }, [initialRedemptions, historyPromotionFilter, historyCustomerFilter]);
  const historyStats = useMemo(() => {
    const totalDiscount = filteredHistory.reduce((sum, item) => sum + Number(item.discount_amount ?? 0), 0);
    return { totalDiscount, count: filteredHistory.length };
  }, [filteredHistory]);
  const firstRideTotalDiscount = useMemo(
    () => firstRideRedemptions.reduce((sum, item) => sum + Number(item.discount_amount ?? 0), 0),
    [firstRideRedemptions],
  );

  const refreshPromotions = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (data) {
      setPromotions(data as Promotion[]);
      const nextFirst = (data as Promotion[]).find((item) => item.type === "first_ride");
      setFirstRideForm(toForm(nextFirst));
    }
  };

  const savePromotion = async (type: "first_ride" | "general", form: PromotionForm) => {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    const discountPercent = Number(form.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error("El porcentaje debe estar entre 0 y 100.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type,
      discount_percent: discountPercent,
      max_discount_amount: asNumberOrNull(form.maxDiscountAmount),
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      max_uses_total: asNumberOrNull(form.maxUsesTotal),
      message: form.message.trim() || null,
      is_active: form.isActive,
    };

    setSaving(true);
    const supabase = createClient();
    const query = form.id
      ? supabase.from("promotions").update(payload).eq("id", form.id)
      : supabase.from("promotions").insert(payload);
    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error("No se pudo guardar la promocion.");
      return;
    }
    await refreshPromotions();
    toast.success("Promocion guardada.");
  };

  if (hasSchemaError) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Falta aplicar SQL: `supabase/sql/2026-03-admin-promotions.sql`
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab("first")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "first" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Promocion 1er viaje</button>
          <button onClick={() => setTab("general")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "general" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Promociones generales</button>
          <button onClick={() => setTab("history")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "history" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Historial y uso</button>
        </div>
      </section>

      {tab === "first" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Descuento por 1er viaje</h2>
          <p className="mt-1 text-sm text-slate-600">Se aplica al pasar un viaje a Finalizado.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={firstRideForm.name} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nombre promocion" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input value={firstRideForm.discountPercent} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, discountPercent: e.target.value }))} placeholder="% descuento" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input value={firstRideForm.maxDiscountAmount} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))} placeholder="Tope descuento $" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input value={firstRideForm.maxUsesTotal} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, maxUsesTotal: e.target.value }))} placeholder="Limite total usos" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="datetime-local" value={firstRideForm.startsAt} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, startsAt: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="datetime-local" value={firstRideForm.endsAt} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, endsAt: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={firstRideForm.isActive} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              Activa
            </label>
            <input value={firstRideForm.message} onChange={(e) => setFirstRideForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Mensaje visible" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => savePromotion("first_ride", firstRideForm)}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MoneyCard label="Usos totales" value={String(firstRideRedemptions.length)} />
            <MoneyCard label="Descuento total aplicado" value={formatCurrencyARS(firstRideTotalDiscount)} />
            <MoneyCard
              label="Promedio por uso"
              value={formatCurrencyARS(firstRideRedemptions.length ? firstRideTotalDiscount / firstRideRedemptions.length : 0)}
            />
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-slate-900">Ultimos 10 usos</p>
            {firstRideRedemptions.slice(0, 10).length === 0 ? (
              <EmptyState title="Sin usos todavia" description="Cuando se aplique la promo apareceran aqui." />
            ) : (
              firstRideRedemptions.slice(0, 10).map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.customer_name ?? "Cliente"} | {formatCurrencyARS(item.discount_amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(item.created_at)} | Original {formatCurrencyARS(item.original_amount)} - Final{" "}
                    {formatCurrencyARS(item.final_amount)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "general" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Promociones generales</h2>
            <div className="flex items-center gap-2">
              <select
                value={generalStatusFilter}
                onChange={(event) => setGeneralStatusFilter(event.target.value as "all" | "active" | "inactive")}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
              <button type="button" onClick={() => setEditingGeneral(toForm())} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">Crear promocion</button>
            </div>
          </div>

          {editingGeneral ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-2 md:grid-cols-2">
                <input value={editingGeneral.name} onChange={(e) => setEditingGeneral((prev) => (prev ? { ...prev, name: e.target.value } : prev))} placeholder="Nombre" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input value={editingGeneral.discountPercent} onChange={(e) => setEditingGeneral((prev) => (prev ? { ...prev, discountPercent: e.target.value } : prev))} placeholder="% descuento" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={saving} onClick={() => editingGeneral && savePromotion("general", editingGeneral)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
                <button type="button" onClick={() => setEditingGeneral(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {visibleGeneralPromotions.length === 0 ? (
              <EmptyState title="Sin promociones generales" description="Crea la primera promocion." />
            ) : (
              visibleGeneralPromotions.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.name} ({item.discount_percent}%)</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingGeneral(toForm(item))} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">Editar</button>
                      <button
                        type="button"
                        onClick={async () => {
                          const supabase = createClient();
                          const { error } = await supabase.from("promotions").update({ is_active: !item.is_active }).eq("id", item.id);
                          if (error) {
                            toast.error("No se pudo actualizar estado.");
                            return;
                          }
                          await refreshPromotions();
                          toast.success("Estado actualizado.");
                        }}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                      >
                        {item.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-3">
            <MoneyCard label="Viajes con promo" value={String(historyStats.count)} />
            <MoneyCard label="Descuento total" value={formatCurrencyARS(historyStats.totalDiscount)} />
            <MoneyCard label="Promedio descuento" value={formatCurrencyARS(historyStats.count ? historyStats.totalDiscount / historyStats.count : 0)} />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Historial de redenciones</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <select
                value={historyPromotionFilter}
                onChange={(event) => setHistoryPromotionFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas las promociones</option>
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.name}
                  </option>
                ))}
              </select>
              <input
                value={historyCustomerFilter}
                onChange={(event) => setHistoryCustomerFilter(event.target.value)}
                placeholder="Filtrar por cliente"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 space-y-2">
              {filteredHistory.length === 0 ? (
                <EmptyState title="Sin redenciones" description="Todavia no se aplicaron promociones." />
              ) : (
                filteredHistory.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.promotion_name ?? "Promocion"} | {item.customer_name ?? "Cliente"}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)} | Descuento {item.discount_percent}%: {formatCurrencyARS(item.discount_amount)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
