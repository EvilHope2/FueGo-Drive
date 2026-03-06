import Link from "next/link";

export function AuthLegalFooter() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
      <Link href="/terminos" className="font-medium text-slate-600 hover:text-slate-900">
        Terminos y Condiciones
      </Link>
      <span className="text-slate-300">|</span>
      <Link href="/privacidad" className="font-medium text-slate-600 hover:text-slate-900">
        Politica de Privacidad
      </Link>
    </div>
  );
}
