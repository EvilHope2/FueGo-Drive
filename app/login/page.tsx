import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10 sm:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Ingresar</h1>
        <p className="mb-6 text-sm text-slate-600">Accede con tu cuenta de FueGo.</p>
        <LoginForm />
      </section>
    </main>
  );
}
