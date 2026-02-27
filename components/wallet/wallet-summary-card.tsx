import { formatCurrencyARS } from "@/lib/utils";

type Props = {
  title: string;
  value: number;
  caption?: string;
};

export function WalletSummaryCard({ title, value, caption }: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{formatCurrencyARS(value)}</p>
      {caption ? <p className="mt-1 text-sm text-slate-600">{caption}</p> : null}
    </article>
  );
}
