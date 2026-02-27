import Link from "next/link";

import { DebtSuspensionAlert } from "@/components/wallet/debt-suspension-alert";
import { WalletBalanceBadge } from "@/components/wallet/wallet-balance-badge";
import { WalletSummaryCard } from "@/components/wallet/wallet-summary-card";
import { WalletTransactionsTable } from "@/components/wallet/wallet-transactions-table";
import type { DriverWalletTransaction } from "@/lib/types";

type Props = {
  balance: number;
  pendingCommission: number;
  totalPayments: number;
  lastTransaction: DriverWalletTransaction | null;
  transactions: DriverWalletTransaction[];
  isSuspended: boolean;
};

export function DriverWalletPage({
  balance,
  pendingCommission,
  totalPayments,
  lastTransaction,
  transactions,
  isSuspended,
}: Props) {
  return (
    <div className="space-y-6">
      <Link href="/driver" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al panel
      </Link>

      {isSuspended ? <DebtSuspensionAlert balance={balance} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Wallet del conductor</h2>
          <WalletBalanceBadge balance={balance} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {balance < 0
            ? "Este es el total pendiente que debés abonar a FueGo."
            : balance === 0
              ? "Estás al día con FueGo."
              : "Tenés saldo a favor."}
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <WalletSummaryCard title="Saldo actual" value={balance} />
        <WalletSummaryCard title="Comisiones pendientes" value={pendingCommission} />
        <WalletSummaryCard title="Pagos registrados" value={totalPayments} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Último movimiento</h3>
        <p className="mt-2 text-sm text-slate-700">{lastTransaction ? lastTransaction.description : "Sin movimientos"}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Historial de movimientos</h3>
        <WalletTransactionsTable transactions={transactions} />
      </section>
    </div>
  );
}
