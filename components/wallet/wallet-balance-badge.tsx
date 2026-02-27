import { cn, formatCurrencyARS } from "@/lib/utils";

type Props = {
  balance: number;
};

export function WalletBalanceBadge({ balance }: Props) {
  const tone = balance < 0 ? "bg-rose-100 text-rose-700" : balance > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700";

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tone)}>{formatCurrencyARS(balance)}</span>;
}
