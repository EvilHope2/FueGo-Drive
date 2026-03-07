import { formatCurrencyARS } from "@/lib/utils";

type Props = {
  estimatedPrice: number | null;
  commissionAmount?: number | null;
  driverEarnings?: number | null;
  commissionPercent?: number | null;
  adminCommissionAmount?: number | null;
  adminCommissionPercent?: number | null;
  affiliateCommissionAmount?: number | null;
  affiliateCommissionPercent?: number | null;
  showBreakdown?: boolean;
};

export function RidePriceSummary({
  estimatedPrice,
  commissionAmount,
  driverEarnings,
  commissionPercent,
  adminCommissionAmount,
  adminCommissionPercent,
  affiliateCommissionAmount,
  affiliateCommissionPercent,
  showBreakdown = false,
}: Props) {
  const hasSplitCommission =
    (adminCommissionAmount != null || adminCommissionPercent != null) &&
    (affiliateCommissionAmount != null || affiliateCommissionPercent != null);
  const resolvedAdminAmount = Number(adminCommissionAmount ?? commissionAmount ?? 0);
  const resolvedAdminPercent = Number(adminCommissionPercent ?? (hasSplitCommission ? 0 : commissionPercent ?? 0));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Estimado: {formatCurrencyARS(estimatedPrice)}</p>
      {showBreakdown ? (
        <>
          <p className="mt-1">
            Comisión FueGo ({Math.round(resolvedAdminPercent)}%): {formatCurrencyARS(resolvedAdminAmount)}
          </p>
          <p className="mt-1 font-medium text-slate-900">Ganancia conductor: {formatCurrencyARS(driverEarnings ?? null)}</p>
        </>
      ) : null}
    </div>
  );
}

