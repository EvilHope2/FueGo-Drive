import Link from "next/link";

import { LogoutButton } from "@/components/common/logout-button";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-indigo-700">
            FueGo
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-indigo-100">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
