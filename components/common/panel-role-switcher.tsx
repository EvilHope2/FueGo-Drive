import Link from "next/link";

type PanelRoleSwitcherProps = {
  currentPanel: "driver" | "affiliate";
  canAccessDriver: boolean;
  canAccessAffiliate: boolean;
};

export function PanelRoleSwitcher({ currentPanel, canAccessDriver, canAccessAffiliate }: PanelRoleSwitcherProps) {
  const hasBothRoles = canAccessDriver && canAccessAffiliate;
  if (!hasBothRoles) return null;

  const href = currentPanel === "driver" ? "/affiliate" : "/driver";
  const label = currentPanel === "driver" ? "Ir a panel de afiliado" : "Ir a panel de conductor";

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Tu cuenta tiene acceso a ambos paneles.</p>
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          {label}
        </Link>
      </div>
    </section>
  );
}
