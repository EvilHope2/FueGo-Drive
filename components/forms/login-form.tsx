"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ROLE_PATHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const schema = z.object({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword(values);

      if (signInError || !data.user) {
        const message = signInError?.message ?? "No se pudo iniciar sesion";
        if (message.toLowerCase().includes("email not confirmed")) {
          setError("Tu email no esta confirmado. Revisa tu casilla y confirma la cuenta.");
        } else {
          setError(message);
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const metadataRole = data.user.user_metadata?.role;
      const inferredRole: Role =
        metadataRole === "driver" || metadataRole === "admin" || metadataRole === "affiliate" ? metadataRole : "customer";

      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          role: inferredRole,
          full_name: (data.user.user_metadata?.full_name as string | undefined) ?? data.user.email?.split("@")[0] ?? "Usuario",
          email: data.user.email ?? null,
          phone: (data.user.user_metadata?.phone as string | undefined) ?? "",
          affiliate_code: (data.user.user_metadata?.affiliate_code as string | undefined) ?? null,
          affiliate_referral_link: (data.user.user_metadata?.affiliate_referral_link as string | undefined) ?? null,
          referred_by_affiliate_id: (data.user.user_metadata?.referred_by_affiliate_id as string | undefined) ?? null,
          referred_by_affiliate_code: (data.user.user_metadata?.referred_by_affiliate_code as string | undefined) ?? null,
          vehicle_plate: (data.user.user_metadata?.vehicle_plate as string | undefined) ?? null,
          vehicle_brand: (data.user.user_metadata?.vehicle_brand as string | undefined) ?? null,
          vehicle_model_year: (data.user.user_metadata?.vehicle_model_year as string | undefined) ?? null,
        });
      }

      const role = (profile?.role as Role | undefined) ?? inferredRole;

      window.location.assign(ROLE_PATHS[role]);
      return;
    } catch {
      setError("Error de configuracion. Revisa variables de entorno en Vercel y recarga.");
    }
    setLoading(false);
  };

  const resendVerification = async () => {
    const email = getValues("email");
    if (!email) {
      setError("Ingresa tu email y luego presiona reenviar.");
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const emailRedirectTo = `${siteUrl}/login`;
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });

      if (resendError) {
        setError(resendError.message);
        setResending(false);
        return;
      }

      setNotice("Te reenviamos el email de verificacion.");
    } catch {
      setError("Error de configuracion. Revisa variables de entorno en Vercel y recarga.");
    }
    setResending(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>

      <button
        type="button"
        onClick={resendVerification}
        disabled={resending}
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {resending ? "Reenviando..." : "Reenviar email de verificacion"}
      </button>

      <p className="text-center text-sm text-slate-600">
        No tenes cuenta?{" "}
        <Link href="/registro-cliente" className="font-medium text-indigo-700 hover:text-indigo-800">
          Registro cliente
        </Link>
        {" · "}
        <Link href="/registro-conductor" className="font-medium text-indigo-700 hover:text-indigo-800">
          Soy conductor
        </Link>
      </p>
    </form>
  );
}

