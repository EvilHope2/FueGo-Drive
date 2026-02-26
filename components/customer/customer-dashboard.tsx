"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { StatusBadge } from "@/components/common/status-badge";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Profile, Ride } from "@/lib/types";

const schema = z.object({
  origin: z.string().min(3, "Ingresa origen"),
  destination: z.string().min(3, "Ingresa destino"),
  customerName: z.string().min(2, "Ingresa nombre"),
  customerPhone: z.string().min(8, "Ingresa WhatsApp"),
  note: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  profile: Profile;
  initialRides: Ride[];
};

export function CustomerDashboard({ profile, initialRides }: Props) {
  const [rides, setRides] = useState(initialRides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: profile.full_name ?? "",
      customerPhone: profile.phone ?? "",
    },
  });

  const createRide = async (values: FormValues) => {
    setLoading(true);
    setError(null);

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
    reset({
      origin: "",
      destination: "",
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      note: "",
    });
    setLoading(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pedir FueGo</h2>
        <p className="mt-1 text-sm text-slate-600">Carga origen, destino y contacto para solicitar un auto.</p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit(createRide)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Origen</label>
            <input {...register("origin")} className="field" />
            {errors.origin ? <p className="error">{errors.origin.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Destino</label>
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

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
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
                    {ride.origin} ? {ride.destination}
                  </p>
                  <StatusBadge status={ride.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(ride.created_at)}</p>
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
  );
}
