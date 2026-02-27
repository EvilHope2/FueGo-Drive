"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { StatusBadge } from "@/components/common/status-badge";
import { ALL_NEIGHBORHOODS, ZONE_NEIGHBORHOODS } from "@/lib/constants";
import { calculateEstimatedPrice, toPriceNumber } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { NeighborhoodSurcharge, Profile, Ride, ZoneBasePrice } from "@/lib/types";

const schema = z.object({
  origin: z.string().min(3, "Ingresa origen"),
  destination: z.string().min(3, "Ingresa destino"),
  fromNeighborhood: z.string().min(1, "Selecciona barrio origen"),
  toNeighborhood: z.string().min(1, "Selecciona barrio destino"),
  customerName: z.string().min(2, "Ingresa nombre"),
  customerPhone: z.string().min(8, "Ingresa WhatsApp"),
  note: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  profile: Profile;
  initialRides: Ride[];
  basePrices: ZoneBasePrice[];
  surcharges: NeighborhoodSurcharge[];
};

export function CustomerDashboard({ profile, initialRides, basePrices, surcharges }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: profile.full_name ?? "",
      customerPhone: profile.phone ?? "",
    },
  });

  const fromNeighborhood = useWatch({ control, name: "fromNeighborhood" });
  const toNeighborhood = useWatch({ control, name: "toNeighborhood" });

  const estimate = useMemo(() => {
    if (!fromNeighborhood || !toNeighborhood) return null;

    return calculateEstimatedPrice({
      fromNeighborhood,
      toNeighborhood,
      basePrices,
      surcharges,
    });
  }, [fromNeighborhood, toNeighborhood, basePrices, surcharges]);

  const activeRide = useMemo(
    () => rides.find((ride) => !["Finalizado", "Cancelado"].includes(ride.status)),
    [rides],
  );

  const createRide = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setNotice(null);

    const currentEstimate = calculateEstimatedPrice({
      fromNeighborhood: values.fromNeighborhood,
      toNeighborhood: values.toNeighborhood,
      basePrices,
      surcharges,
    });

    if (!currentEstimate) {
      setError("No se pudo calcular el estimado. Revisa barrios seleccionados.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    await supabase
      .from("profiles")
      .update({ full_name: values.customerName, phone: values.customerPhone })
      .eq("id", profile.id);

    const { data, error: insertError } = await supabase
      .from("rides")
      .insert({
        customer_id: profile.id,
        origin: values.origin,
        destination: values.destination,
        from_zone: currentEstimate.fromZone,
        from_neighborhood: values.fromNeighborhood,
        to_zone: currentEstimate.toZone,
        to_neighborhood: values.toNeighborhood,
        estimated_price: currentEstimate.estimatedPrice,
        customer_name: values.customerName,
        customer_phone: values.customerPhone,
        note: values.note?.trim() || null,
        status: "Solicitado",
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "No se pudo crear el viaje");
      setLoading(false);
      return;
    }

    setRides((prev) => [data as Ride, ...prev]);
    setNotice("Viaje solicitado con exito.");
    reset({
      origin: "",
      destination: "",
      fromNeighborhood: "",
      toNeighborhood: "",
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      note: "",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {activeRide ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Viaje activo</p>
              <p className="mt-1 text-sm text-indigo-800">
                {activeRide.origin} {"->"} {activeRide.destination}
              </p>
            </div>
            <StatusBadge status={activeRide.status} />
          </div>
          <Link href={`/app/viaje/${activeRide.id}`} className="mt-3 inline-flex text-sm font-semibold text-indigo-700">
            Ver seguimiento
          </Link>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pedir FueGo</h2>
          <p className="mt-1 text-sm text-slate-600">Indica direcciones, barrios y contacto para solicitar el viaje.</p>

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
              <label className="mb-1 block text-sm font-medium text-slate-700">Origen (direccion)</label>
              <input {...register("origin")} className="field" />
              {errors.origin ? <p className="error">{errors.origin.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Destino (direccion)</label>
              <input {...register("destination")} className="field" />
              {errors.destination ? <p className="error">{errors.destination.message}</p> : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                Zona: {estimate ? `${estimate.fromZone} -> ${estimate.toZone}` : "Selecciona barrios"}
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                Estimado: {estimate ? formatCurrency(estimate.estimatedPrice) : "-"}
              </p>
            </div>

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
            >
              {loading ? "Enviando..." : "Pedir FueGo"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mis viajes</h2>
          <div className="mt-4 space-y-3">
            {rides.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No tenes viajes todavia
              </p>
            ) : (
              rides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {ride.from_neighborhood ?? "-"} {"->"} {ride.to_neighborhood ?? "-"}
                    </p>
                    <StatusBadge status={ride.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
                  <p className="mt-1 text-sm text-slate-700">Estimado: {formatCurrency(toPriceNumber(ride.estimated_price))}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {ride.origin} {"->"} {ride.destination}
                  </p>
                  <Link
                    href={`/app/viaje/${ride.id}`}
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

      <datalist id="neighborhood-options">
        {ALL_NEIGHBORHOODS.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}
