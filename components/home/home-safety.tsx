import { ShieldCheck, MessageCircle, UserRoundCheck } from "lucide-react";

const items = [
  {
    icon: UserRoundCheck,
    title: "Chofer identificado",
    text: "Antes de subir, ves nombre del conductor, patente y vehiculo asignado.",
  },
  {
    icon: ShieldCheck,
    title: "Estados visibles",
    text: "Segui cada etapa del viaje con una linea de progreso clara y actualizada.",
  },
  {
    icon: MessageCircle,
    title: "Contacto rapido",
    text: "Cuando lo necesites, podes contactar por WhatsApp de forma directa.",
  },
];

export function HomeSafety() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px]">
        <h2 className="text-3xl font-bold tracking-tight text-[#0F172A]">Viaja con confianza</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <item.icon className="h-6 w-6 text-[#1D4ED8]" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
