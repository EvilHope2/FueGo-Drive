import type { DriverWalletTransaction } from "@/lib/types";
import { formatCurrencyARS, formatDateTime } from "@/lib/utils";

type Props = {
  transactions: DriverWalletTransaction[];
};

export function WalletTransactionsTable({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        No hay movimientos todavía.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <article key={tx.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{tx.description}</p>
            <p className={`text-sm font-semibold ${tx.amount < 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {formatCurrencyARS(tx.amount)}
            </p>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <p>Fecha: {formatDateTime(tx.created_at)}</p>
            <p>Tipo: {tx.type}</p>
            <p>Método: {tx.payment_method ?? "-"}</p>
            <p>Viaje: {tx.ride_id ? `#${tx.ride_id.slice(0, 8)}` : "-"}</p>
            {tx.notes ? <p className="sm:col-span-2">Nota: {tx.notes}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
