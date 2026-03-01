"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getAffiliateFromRefCode, normalizeAffiliateCode } from "@/lib/affiliate";
import { ROLE_PATHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre"),
  phone: z.string().min(8, "Ingresa telefono WhatsApp"),
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirma tu contrasena"),
  affiliateCode: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleModelYear: z.string().optional(),
})
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  role: Exclude<Role, "admin">;
  initialAffiliateCode?: string;
};

export function RegisterForm({ role, initialAffiliateCode }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [affiliateNotice, setAffiliateNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const queryRef = normalizeAffiliateCode(initialAffiliateCode ?? "");

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedPlate = values.vehiclePlate?.trim().toUpperCase() ?? "";
      const normalizedBrand = values.vehicleBrand?.trim() ?? "";
      const normalizedModelYear = values.vehicleModelYear?.trim() ?? "";

      if (role === "driver") {
        if (!normalizedPlate) {
          setError("Ingresa la patente.");
          setLoading(false);
          return;
        }
        if (!normalizedBrand) {
          setError("Ingresa la marca del auto.");
          setLoading(false);
          return;
        }
        if (!normalizedModelYear) {
          setError("Ingresa el modelo / año.");
          setLoading(false);
          return;
        }
      }

      const supabase = createClient();
      let affiliateId: string | null = null;
      let affiliateCodeToStore: string | null = null;

      const typedAffiliateCode = normalizeAffiliateCode(values.affiliateCode ?? "");
      const affiliateCode = queryRef || typedAffiliateCode;
      if (role === "driver" && affiliateCode) {
        const affiliateData = await getAffiliateFromRefCode(supabase, affiliateCode);

        if (affiliateData) {
          affiliateId = affiliateData.id as string;
          affiliateCodeToStore = affiliateData.affiliate_code as string;
          setAffiliateNotice("Registro con referido válido aplicado.");
        } else {
          setAffiliateNotice("Código de afiliado no válido. Se registrará sin referido.");
        }
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const emailRedirectTo = `${siteUrl}/login`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo,
          data: {
            role,
            full_name: values.fullName,
            phone: values.phone,
            vehicle_plate: role === "driver" ? normalizedPlate : null,
            vehicle_brand: role === "driver" ? normalizedBrand : null,
            vehicle_model_year: role === "driver" ? normalizedModelYear : null,
            referred_by_affiliate_id: role === "driver" ? affiliateId : null,
            referred_by_affiliate_code: role === "driver" ? affiliateCodeToStore : null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!signUpData.session) {
        setSuccess("Cuenta creada. Revisa tu email para confirmar la cuenta y luego ingresa.");
        setLoading(false);
        return;
      }

      window.location.assign(ROLE_PATHS[role]);
      return;
    } catch {
      setError("Error de configuracion. Revisa variables de entorno en Vercel y recarga.");
    }
    setLoading(false);
  };

  const title = role === "driver" ? "Registro conductor" : role === "affiliate" ? "Registro afiliado" : "Registro cliente";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
        <input
          {...register("fullName")}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {errors.fullName ? <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp (formato internacional)</label>
        <input
          {...register("phone")}
          placeholder="5492964..."
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {errors.phone ? <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p> : null}
      </div>

      {role === "driver" ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Código de afiliado (opcional)</label>
            <input
              {...register("affiliateCode")}
              defaultValue={queryRef}
              disabled={Boolean(queryRef)}
              placeholder="ABC123"
              className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${
                queryRef ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white text-slate-900"
              }`}
            />
            {queryRef ? <p className="mt-1 text-xs text-slate-500">Registro con referido aplicado desde el link.</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patente</label>
            <input
              {...register("vehiclePlate")}
              placeholder="AB123CD"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Marca del auto</label>
            <input
              {...register("vehicleBrand")}
              placeholder="Fiat"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Modelo / año</label>
            <input
              {...register("vehicleModelYear")}
              placeholder="Cronos 2022"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          {...register("email")}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contrasena</label>
        <input
          type="password"
          {...register("password")}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {errors.password ? <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar contrasena</label>
        <input
          type="password"
          {...register("confirmPassword")}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {errors.confirmPassword ? (
          <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {affiliateNotice ? <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">{affiliateNotice}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creando..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Ya tenes cuenta?{" "}
        <Link href="/login" className="font-medium text-indigo-700 hover:text-indigo-800">
          Ingresar
        </Link>
      </p>
    </form>
  );
}

