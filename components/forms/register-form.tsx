"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ROLE_PATHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre"),
  phone: z.string().min(8, "Ingresa telefono WhatsApp"),
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  role: Exclude<Role, "admin">;
};

export function RegisterForm({ role }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role,
          full_name: values.fullName,
          phone: values.phone,
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

    router.push(ROLE_PATHS[role]);
    router.refresh();
    setLoading(false);
  };

  const title = role === "driver" ? "Registro conductor" : "Registro cliente";

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
