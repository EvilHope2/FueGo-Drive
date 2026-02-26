import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterDriverPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10 sm:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <RegisterForm role="driver" />
      </section>
    </main>
  );
}
