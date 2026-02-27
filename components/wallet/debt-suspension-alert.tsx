import { buildDebtAlertMessage } from "@/lib/wallet";

type Props = {
  balance: number;
};

export function DebtSuspensionAlert({ balance }: Props) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-700">Cuenta suspendida por deuda</p>
      <p className="mt-1 text-sm text-rose-700">{buildDebtAlertMessage(balance)}</p>
      <p className="mt-1 text-sm text-rose-700">No podés aceptar nuevos viajes hasta regularizar el pago.</p>
    </div>
  );
}
