"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ALL_NEIGHBORHOODS, ZONE_NEIGHBORHOODS } from "@/lib/constants";
import { calculateEstimatedRidePrice, calculateRideEconomics, toPriceNumber } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";
import type { NeighborhoodSurcharge, Profile, Promotion, Ride, ZoneBasePrice } from "@/lib/types";

const schema = z.object({
  origin: z.string().min(3, "Ingresa origen"),
  destination: z.string().min(3, "Ingresa destino"),
  fromNeighborhood: z.string().min(1, "Selecciona barrio origen"),
  toNeighborhood: z.string().min(1, "Selecciona barrio destino"),
  customerName: z.string().min(2, "Ingresa nombre"),
  customerPhone: z.string().min(8, "Ingresa WhatsApp"),
  paymentMethod: z.string().refine((value) => value === "cash" || value === "transfer", "Selecciona un metodo de pago"),
  note: z.string().max(200).optional(),
});

type FormValues = z.input<typeof schema>;

type FavoriteSlot = "home" | "work" | "other";

type FavoriteAddress = {
  slot: FavoriteSlot;
  label: string;
  neighborhood: string;
  address: string;
};

type Props = {
  profile: Profile;
  initialRides: Ride[];
  basePrices: ZoneBasePrice[];
  surcharges: NeighborhoodSurcharge[];
  promotions: Promotion[];
};

const FAVORITE_STORAGE_KEY = "fuego_customer_favorites_v1";
const FAVORITE_LABELS: Record<FavoriteSlot, string> = {
  home: "Casa",
  work: "Trabajo",
  other: "Otro",
};

export function CustomerDashboard({ profile, initialRides, basePrices, surcharges, promotions }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"todos" | "activos" | "finalizados" | "cancelados">("todos");
  const [favorites, setFavorites] = useState<FavoriteAddress[]>([]);

  const {
    register,
    reset,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: profile.full_name ?? "",
      customerPhone: profile.phone ?? "",
      paymentMethod: "",
    },
  });

  const fromNeighborhood = useWatch({ control, name: "fromNeighborhood" });
  const toNeighborhood = useWatch({ control, name: "toNeighborhood" });
  const originValue = useWatch({ control, name: "origin" });
  const destinationValue = useWatch({ control, name: "destination" });
  const paymentMethodValue = useWatch({ control, name: "paymentMethod" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FavoriteAddress[];
      if (Array.isArray(parsed)) setFavorites(parsed);
    } catch {
      // ignore invalid local storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore storage errors
    }
  }, [favorites]);

  const estimate = useMemo(() => {
    if (!fromNeighborhood || !toNeighborhood) return null;

    return calculateEstimatedRidePrice({
      fromNeighborhood,
      toNeighborhood,
      basePrices,
      surcharges,
    });
  }, [fromNeighborhood, toNeighborhood, basePrices, surcharges]);

  const activeRide = useMemo(() => rides.find((ride) => !["Finalizado", "Cancelado"].includes(ride.status)), [rides]);
  const hasFinalizedRide = useMemo(() => rides.some((ride) => ride.status === "Finalizado"), [rides]);

  const promoPreview = useMemo(() => {
    const now = new Date();
    const estimatedPrice = estimate?.estimatedPrice ?? 0;

    const applicable = promotions.filter((promo) => {
      if (!promo.is_active || promo.deleted_at) return false;
      if (promo.starts_at && new Date(promo.starts_at) > now) return false;
      if (promo.ends_at && new Date(promo.ends_at) < now) return false;
      if (promo.type === "first_ride" && hasFinalizedRide) return false;
      if (promo.min_ride_amount != null && estimatedPrice < Number(promo.min_ride_amount)) return false;
      if (
        paymentMethodValue &&
        promo.allowed_payment_methods &&
        promo.allowed_payment_methods.length > 0 &&
        !promo.allowed_payment_methods.includes(paymentMethodValue)
      ) {
        return false;
      }
      return true;
    });

    if (applicable.length === 0) return null;
    return applicable.sort((a, b) => Number(b.discount_percent) - Number(a.discount_percent))[0];
  }, [promotions, hasFinalizedRide, estimate?.estimatedPrice, paymentMethodValue]);

  const visibleRides = useMemo(() => {
    if (historyFilter === "activos") return rides.filter((ride) => !["Finalizado", "Cancelado"].includes(ride.status));
    if (historyFilter === "finalizados") return rides.filter((ride) => ride.status === "Finalizado");
    if (historyFilter === "cancelados") return rides.filter((ride) => ride.status === "Cancelado");
    return rides;
  }, [rides, historyFilter]);

  const saveOriginFavorite = (slot: FavoriteSlot) => {
    const neighborhood = getValues("fromNeighborhood");
    const address = getValues("origin");

    if (!neighborhood || !address) {
      toast.error("Completa barrio y direccion de origen para guardar favorito.");
      return;
    }

    setFavorites((prev) => {
      const next = prev.filter((item) => item.slot !== slot);
      next.push({
        slot,
        label: FAVORITE_LABELS[slot],
        neighborhood,
        address,
      });
      return next;
    });

    toast.success(`Origen guardado en ${FAVORITE_LABELS[slot]}.`);
  };

  const useFavoriteAs = (favorite: FavoriteAddress, mode: "origin" | "destination") => {
    if (mode === "origin") {
      setValue("fromNeighborhood", favorite.neighborhood, { shouldValidate: true });
      setValue("origin", favorite.address, { shouldValidate: true });
      return;
    }

    setValue("toNeighborhood", favorite.neighborhood, { shouldValidate: true });
    setValue("destination", favorite.address, { shouldValidate: true });
  };

  const createRide = async (values: FormValues) => {
    setLoading(true);

    const currentEstimate = calculateEstimatedRidePrice({
      fromNeighborhood: values.fromNeighborhood,
      toNeighborhood: values.toNeighborhood,
      basePrices,
      surcharges,
    });

    if (!currentEstimate) {
      toast.error("No se pudo calcular el estimado. Revisa barrios seleccionados.");
      setLoading(false);
      return;
    }

    const economics = calculateRideEconomics(currentEstimate.estimatedPrice, false);
    const supabase = createClient();

    await supabase.from("profiles").update({ full_name: values.customerName, phone: values.customerPhone }).eq("id", profile.id);

    const { data, error: insertError } = await supabase
      .from("rides")
      .insert({
        customer_id: profile.id,
        origin: values.origin,
        destination: values.destination,
        origin_address: values.origin,
        destination_address: values.destination,
        from_zone: currentEstimate.fromZone,
        from_neighborhood: values.fromNeighborhood,
        to_zone: currentEstimate.toZone,
        to_neighborhood: values.toNeighborhood,
        estimated_price: currentEstimate.estimatedPrice,
        affiliate_commission_percent: economics.affiliateCommissionPercent,
        affiliate_commission_amount: economics.affiliateCommissionAmount,
        admin_commission_percent: economics.adminCommissionPercent,
        admin_commission_amount: economics.adminCommissionAmount,
        commission_percent: economics.adminCommissionPercent,
        commission_amount: economics.adminCommissionAmount,
        driver_earnings: economics.driverEarnings,
        affiliate_id: null,
        customer_name: values.customerName,
        customer_phone: values.customerPhone,
        payment_method: values.paymentMethod as Ride["payment_method"],
        note: values.note?.trim() || null,
        status: "Solicitado",
      })
      .select("*")
      .single();

    if (insertError || !data) {
      toast.error(insertError?.message ?? "No se pudo crear el viaje");
      setLoading(false);
      return;
    }

    await fetch("/api/push/new-ride", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rideId: data.id }),
    }).catch(() => {
      // Notifications are complementary; do not block ride creation.
    });

    setRides((prev) => [data as Ride, ...prev]);
    toast.success("Viaje solicitado con exito.");
    reset({
      origin: "",
      destination: "",
      fromNeighborhood: "",
      toNeighborhood: "",
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      paymentMethod: "",
      note: "",
    });
    setLoading(false);
  };

  const paymentMethodLabel = paymentMethodValue === "cash" ? "Efectivo" : paymentMethodValue === "transfer" ? "Transferencia" : "-";

  return (
    <div className="space-y-6">
      {activeRide ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Mi viaje activo</p>
              <p className="mt-1 text-sm text-indigo-800">
                {activeRide.origin_address ?? activeRide.origin} {"->"} {activeRide.destination_address ?? activeRide.destination}
              </p>
            </div>
            <StatusBadge status={activeRide.status} />
          </div>
          <Link href={`/app/viaje/${activeRide.id}`} className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Continuar seguimiento
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Direcciones favoritas</h2>
          <p className="text-xs text-slate-500">Guardadas en este dispositivo</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(["home", "work", "other"] as FavoriteSlot[]).map((slot) => {
            const favorite = favorites.find((item) => item.slot === slot);
            return (
              <article key={slot} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{FAVORITE_LABELS[slot]}</p>
                {favorite ? (
                  <>
                    <p className="mt-1 text-xs text-slate-600">{favorite.neighborhood}</p>
                    <p className="text-xs text-slate-600">{favorite.address}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => useFavoriteAs(favorite, "origin")}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        Usar origen
                      </button>
                      <button
                        type="button"
                        onClick={() => useFavoriteAs(favorite, "destination")}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        Usar destino
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Sin guardar</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pedir FueGo</h2>
          <p className="mt-1 text-sm text-slate-600">Primero elegi barrios y direcciones. Lo demas es opcional.</p>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit(createRide)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Barrio origen</label>
                <select {...register("fromNeighborhood")} className="field">
                  <option value="">Seleccionar</option>
                  {Object.entries(ZONE_NEIGHBORHOODS).map(([zone, neighborhoods]) => (
                    <optgroup key={zone} label={zone}>
                      {neighborhoods.map((neighborhood) => (
                        <option key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.fromNeighborhood ? <p className="error">{errors.fromNeighborhood.message}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Barrio destino</label>
                <select {...register("toNeighborhood")} className="field">
                  <option value="">Seleccionar</option>
                  {Object.entries(ZONE_NEIGHBORHOODS).map(([zone, neighborhoods]) => (
                    <optgroup key={zone} label={zone}>
                      {neighborhoods.map((neighborhood) => (
                        <option key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.toNeighborhood ? <p className="error">{errors.toNeighborhood.message}</p> : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Direccion origen</label>
              <input {...register("origin")} className="field" />
              {errors.origin ? <p className="error">{errors.origin.message}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => saveOriginFavorite("home")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">Guardar origen en Casa</button>
              <button type="button" onClick={() => saveOriginFavorite("work")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">Guardar origen en Trabajo</button>
              <button type="button" onClick={() => saveOriginFavorite("other")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">Guardar origen en Otro</button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Direccion destino</label>
              <input {...register("destination")} className="field" />
              {errors.destination ? <p className="error">{errors.destination.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Metodo de pago</label>
              <select {...register("paymentMethod")} className="field">
                <option value="">Seleccionar</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
              {errors.paymentMethod ? <p className="error">{errors.paymentMethod.message}</p> : null}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              {showAdvanced ? "Ocultar datos de contacto y nota" : "Editar datos de contacto y nota"}
            </button>

            {showAdvanced ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nombre y apellido</label>
                    <input {...register("customerName")} className="field" />
                    {errors.customerName ? <p className="error">{errors.customerName.message}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
                    <input {...register("customerPhone")} className="field" />
                    {errors.customerPhone ? <p className="error">{errors.customerPhone.message}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nota (opcional)</label>
                  <textarea {...register("note")} rows={3} className="field" />
                </div>
              </div>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Resumen antes de confirmar</p>
              <p className="mt-2 text-sm text-slate-700">Origen: {fromNeighborhood || "-"} | {originValue || "-"}</p>
              <p className="mt-1 text-sm text-slate-700">Destino: {toNeighborhood || "-"} | {destinationValue || "-"}</p>
              <p className="mt-1 text-sm text-slate-700">Metodo de pago: {paymentMethodLabel}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <p>Estimado: {formatCurrencyARS(estimate?.estimatedPrice ?? null)}</p>
                {promoPreview && estimate?.estimatedPrice ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {promoPreview.discount_percent}% OFF
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">Zona: {estimate ? `${estimate.fromZone} -> ${estimate.toZone}` : "Selecciona barrios"}</p>
            </section>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
            >
              {loading ? "Enviando..." : "Pedir FueGo"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Historial</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setHistoryFilter("todos")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${historyFilter === "todos" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Todos</button>
            <button type="button" onClick={() => setHistoryFilter("activos")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${historyFilter === "activos" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Activos</button>
            <button type="button" onClick={() => setHistoryFilter("finalizados")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${historyFilter === "finalizados" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Finalizados</button>
            <button type="button" onClick={() => setHistoryFilter("cancelados")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${historyFilter === "cancelados" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Cancelados</button>
          </div>
          <div className="mt-4 space-y-3">
            {visibleRides.length === 0 ? (
              <EmptyState title="No hay viajes para este filtro" description="Proba cambiando la vista." />
            ) : (
              visibleRides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                    </p>
                    <StatusBadge status={ride.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <p className="mt-1 text-sm text-slate-700">Estimado: {formatCurrencyARS(toPriceNumber(ride.estimated_price))}</p>
                  <Link href={`/app/viaje/${ride.id}`} className="mt-3 inline-flex text-sm font-medium text-indigo-700 transition hover:text-indigo-800">
                    Ver detalle
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <datalist id="neighborhood-options">
        {ALL_NEIGHBORHOODS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}
