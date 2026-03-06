import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Terminos de uso</h1>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Esta es una version basica de terminos para FueGo. El uso de la plataforma implica aceptar las condiciones vigentes del servicio.
      </p>
    </main>
  );
}
