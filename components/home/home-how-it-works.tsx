import Link from "next/link";

const steps = [
  { title: "Pedi tu viaje", text: "Selecciona barrios, direcciones y metodo de pago en pocos segundos." },
  { title: "Un chofer acepta", text: "Los conductores ven tu solicitud en tiempo real y la toman rapido." },
  { title: "Segui el estado", text: "Acompana tu viaje con estados claros: En camino, Llegando y Afuera." },
];

type Props = { primaryHref: string };

export function HomeHowItWorks({ primaryHref }: Props) {
  return (
    <section id="como-funciona" className="px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px]">
        <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Como funciona</h2>
        <p className="mt-2 text-slate-600">Un flujo simple para cliente y conductor, sin pasos innecesarios.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, idx) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1D4ED8]/10 text-sm font-bold text-[#1D4ED8]">
                {idx + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            </article>
          ))}
        </div>

        <Link href={primaryHref} className="mt-6 inline-flex text-sm font-semibold text-[#1D4ED8] hover:text-[#1E3A8A]">
          Empezar ahora
        </Link>
      </div>
    </section>
  );
}
