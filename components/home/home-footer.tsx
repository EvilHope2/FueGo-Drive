import Link from "next/link";

type Props = {
  supportHref: string;
};

export function HomeFooter({ supportHref }: Props) {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">FueGo</p>
          <p className="mt-1 text-sm text-slate-500">Plataforma de movilidad urbana</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
          <Link href="/terminos" className="transition hover:text-slate-900">
            Términos y Condiciones
          </Link>
          <Link href="/privacidad" className="transition hover:text-slate-900">
            Política de Privacidad
          </Link>
          <Link href={supportHref} className="transition hover:text-slate-900">
            Soporte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
