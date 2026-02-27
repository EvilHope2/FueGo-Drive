import { cn } from "@/lib/utils";

type Props = {
  settled: boolean;
};

export function SettlementStatusBadge({ settled }: Props) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        settled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
      )}
    >
      {settled ? "Liquidado" : "Pendiente"}
    </span>
  );
}

