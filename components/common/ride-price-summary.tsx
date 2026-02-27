import { formatCurrencyARS } from "@/lib/utils";

type Props = {
  estimatedPrice: number | null;
  commissionAmount?: number | null;
  driverEarnings?: number | null;
  commissionPercent?: number | null;
  showBreakdown?: boolean;
};

export function RidePriceSummary({
  estimatedPrice,
  commissionAmount,
  driverEarnings,
  commissionPercent,
  showBreakdown = false,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Estimado: {formatCurrencyARS(estimatedPrice)}</p>
      {showBreakdown ? (
        <>
          <p className="mt-1">
            Comisión FueGo ({Math.round(commissionPercent ?? 0)}%): {formatCurrencyARS(commissionAmount ?? null)}
          </p>
          <p className="mt-1 font-medium text-slate-900">Ganancia conductor: {formatCurrencyARS(driverEarnings ?? null)}</p>
        </>
      ) : null}
    </div>
  );
}

