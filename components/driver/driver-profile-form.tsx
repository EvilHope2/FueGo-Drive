"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { hasLockedValue, isValidDriverWhatsApp, normalizeDriverWhatsApp, normalizeVehiclePlate } from "@/lib/driver-profile";

const schema = z.object({
  fullName: z.string().min(2, "Ingresá nombre y apellido"),
  phone: z.string().min(1, "Ingresá WhatsApp"),
  vehiclePlate: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModelYear: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  profile: Profile;
};

const SUPPORT_MESSAGE = "Si necesitás modificar este dato, comunicate con soporte.";

export function DriverProfileForm({ profile }: Props) {
  const [saving, setSaving] = useState(false);

  const plateLocked = hasLockedValue(profile.vehicle_plate);
  const brandLocked = hasLockedValue(profile.vehicle_brand);
  const modelYearLocked = hasLockedValue(profile.vehicle_model_year);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.full_name ?? "",
      phone: profile.phone ?? "+549",
      vehiclePlate: profile.vehicle_plate ?? "",
      vehicleBrand: profile.vehicle_brand ?? "",
      vehicleModelYear: profile.vehicle_model_year ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);

    const normalizedPhone = normalizeDriverWhatsApp(values.phone);
    if (!isValidDriverWhatsApp(normalizedPhone)) {
      toast.error("El número debe comenzar con +549");
      setSaving(false);
      return;
    }

    const normalizedPlate = normalizeVehiclePlate(values.vehiclePlate ?? "");
    const normalizedBrand = (values.vehicleBrand ?? "").trim();
    const normalizedModelYear = (values.vehicleModelYear ?? "").trim();

    if (!plateLocked && !normalizedPlate) {
      toast.error("Ingresá la patente.");
      setSaving(false);
      return;
    }
    if (!brandLocked && !normalizedBrand) {
      toast.error("Ingresá la marca del auto.");
      setSaving(false);
      return;
    }
    if (!modelYearLocked && !normalizedModelYear) {
      toast.error("Ingresá el modelo / año.");
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.rpc("update_driver_profile", {
      p_full_name: values.fullName.trim(),
      p_phone: normalizedPhone,
      p_vehicle_plate: plateLocked ? null : normalizedPlate,
      p_vehicle_brand: brandLocked ? null : normalizedBrand,
      p_vehicle_model_year: modelYearLocked ? null : normalizedModelYear,
    });

    if (error) {
      if (error.message.includes("PHONE_INVALID_PREFIX")) {
        toast.error("El número debe comenzar con +549");
      } else if (error.message.includes("VEHICLE_FIELD_LOCKED")) {
        toast.error("No podés modificar datos del vehículo ya cargados.");
      } else {
        toast.error("No se pudo actualizar el perfil.");
      }
      setSaving(false);
      return;
    }

    toast.success("Tus datos se actualizaron correctamente");
    setSaving(false);
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre y apellido</label>
            <input {...register("fullName")} className="field" />
            {errors.fullName ? <p className="error">{errors.fullName.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input value={profile.email ?? ""} disabled className="field cursor-not-allowed bg-slate-100 text-slate-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
            <input {...register("phone")} placeholder="+5492964..." className="field" />
            {errors.phone ? <p className="error">{errors.phone.message}</p> : null}
            <p className="mt-1 text-xs text-slate-500">Debe comenzar con +549.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Datos del vehículo</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patente</label>
            <input
              {...register("vehiclePlate")}
              disabled={plateLocked}
              className={`field uppercase ${plateLocked ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
            />
            {plateLocked ? <p className="mt-1 text-xs text-slate-500">{SUPPORT_MESSAGE}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Marca del auto</label>
            <input
              {...register("vehicleBrand")}
              disabled={brandLocked}
              className={`field ${brandLocked ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
            />
            {brandLocked ? <p className="mt-1 text-xs text-slate-500">{SUPPORT_MESSAGE}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Modelo / año</label>
            <input
              {...register("vehicleModelYear")}
              disabled={modelYearLocked}
              className={`field ${modelYearLocked ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
            />
            {modelYearLocked ? <p className="mt-1 text-xs text-slate-500">{SUPPORT_MESSAGE}</p> : null}
          </div>
        </div>
      </section>

      <button
        disabled={saving}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

