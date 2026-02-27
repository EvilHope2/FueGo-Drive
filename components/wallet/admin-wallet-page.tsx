"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DebtSuspensionAlert } from "@/components/wallet/debt-suspension-alert";
import { WalletBalanceBadge } from "@/components/wallet/wallet-balance-badge";
import { WalletTransactionsTable } from "@/components/wallet/wallet-transactions-table";
import { createClient } from "@/lib/supabase/client";
import type { DriverWalletTransaction, WalletPaymentMethod } from "@/lib/types";
import { calculateDriverWalletBalance, getDriverWalletStatus } from "@/lib/wallet";
import { formatCurrencyARS } from "@/lib/utils";

type DriverSummary = {
  id: string;
  full_name: string;
  driver_account_status: "active" | "suspended_debt";
  wallet_limit_negative: number;
};

type Props = {
  drivers: DriverSummary[];
  transactions: DriverWalletTransaction[];
};

export function AdminWalletPage({ drivers, transactions }: Props) {
  const router = useRouter();
  const [selectedDriver, setSelectedDriver] = useState<string>(drivers[0]?.id ?? "");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [method, setMethod] = useState<WalletPaymentMethod>("manual");
  const [loading, setLoading] = useState(false);

  const driverTransactions = useMemo(
    () => transactions.filter((tx) => tx.driver_id === selectedDriver),
    [transactions, selectedDriver],
  );

  const selectedDriverRow = drivers.find((driver) => driver.id === selectedDriver);
  const balance = Number(calculateDriverWalletBalance(driverTransactions.map((tx) => Number(tx.amount ?? 0))) ?? 0);
  const status = getDriverWalletStatus(balance, Number(selectedDriverRow?.wallet_limit_negative ?? -20000));

  const submitTransaction = async (type: "payment" | "adjustment") => {
    if (!selectedDriver || !amount || !description) {
      toast.error("Completa conductor, monto y descripción.");
      return;
    }

    setLoading(true);
    const numericAmount = Number(amount);
    const normalizedAmount = type === "payment" ? Math.abs(numericAmount) : numericAmount;

    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("driver_wallet_transactions").insert({
      driver_id: selectedDriver,
      type,
      amount: normalizedAmount,
      description,
      payment_method: method,
      notes: notes || null,
      created_by: authData.user?.id ?? null,
    });

    if (error) {
      toast.error("No se pudo registrar el movimiento.");
      setLoading(false);
      return;
    }

    toast.success("Movimiento registrado.");
    setAmount("");
    setDescription("");
    setNotes("");
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Wallets de conductores</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {drivers.map((driver) => {
            const tx = transactions.filter((item) => item.driver_id === driver.id);
            const b = Number(calculateDriverWalletBalance(tx.map((item) => Number(item.amount ?? 0))) ?? 0);
            return (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedDriver === driver.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{driver.full_name}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCurrencyARS(b)}</p>
                <p className="mt-1 text-xs text-slate-500">Movimientos: {tx.length}</p>
              </button>
            );
          })}
        </div>
      </section>

      {status === "suspended_debt" ? <DebtSuspensionAlert balance={balance} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">Detalle del conductor</h3>
          <WalletBalanceBadge balance={balance} />
        </div>
        <div className="mt-2 text-sm text-slate-700">
          <p>Conductor: {selectedDriverRow?.full_name ?? "-"}</p>
          <p>Límite: {formatCurrencyARS(selectedDriverRow?.wallet_limit_negative ?? -20000)}</p>
          <p>Estado: {status}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Registrar pago o ajuste</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={method} onChange={(event) => setMethod(event.target.value as WalletPaymentMethod)} className="field">
            <option value="manual">manual</option>
            <option value="transfer">transfer</option>
            <option value="cash">cash</option>
            <option value="platform">platform</option>
          </select>
          <input className="field" placeholder="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input
            className="field md:col-span-2"
            placeholder="Descripción"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <textarea className="field md:col-span-2" rows={2} placeholder="Nota" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => submitTransaction("payment")}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            Registrar pago
          </button>
          <button
            onClick={() => submitTransaction("adjustment")}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
          >
            Registrar ajuste
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Historial de movimientos</h3>
        <WalletTransactionsTable transactions={driverTransactions} />
      </section>
    </div>
  );
}
