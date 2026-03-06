import Link from "next/link";

type Props = {
  primaryHref: string;
};

export function HomeFinalCta({ primaryHref }: Props) {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px] rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] p-8 text-white sm:p-10">
        <h2 className="text-3xl font-bold tracking-tight">Listo para pedir tu FueGo</h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
          Empeza ahora y gestiona tus viajes con una experiencia clara, moderna y confiable.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#1E3A8A] transition hover:bg-slate-100">
            Pedir FueGo
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            Ingresar
          </Link>
        </div>
      </div>
    </section>
  );
}
