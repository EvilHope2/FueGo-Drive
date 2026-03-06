"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type Props = {
  primaryHref: string;
  supportHref: string;
};

const navLinks = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#conductores", label: "Conductores" },
  { href: "#afiliados", label: "Afiliados" },
];

export function HomeNavbar({ primaryHref, supportHref }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          FueGo
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              {item.label}
            </Link>
          ))}
          <Link href={supportHref} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Ayuda
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            Ingresar
          </Link>
          <Link
            href={primaryHref}
            className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1E3A8A]"
          >
            Pedir FueGo
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex rounded-xl border border-slate-300 p-2 text-slate-700 lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-4 sm:px-6">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={supportHref}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Ayuda
            </Link>
            <div className="mt-2 grid gap-2">
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700">
                Ingresar
              </Link>
              <Link
                href={primaryHref}
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Pedir FueGo
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
