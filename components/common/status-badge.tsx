import { cn } from "@/lib/utils";
import type { RideStatus } from "@/lib/constants";

const statusStyles: Record<RideStatus, string> = {
  Solicitado: "bg-slate-100 text-slate-700",
  Aceptado: "bg-indigo-100 text-indigo-700",
  "En camino": "bg-sky-100 text-sky-700",
  Llegando: "bg-blue-100 text-blue-700",
  Afuera: "bg-emerald-100 text-emerald-700",
  Finalizado: "bg-slate-200 text-slate-800",
  Cancelado: "bg-rose-100 text-rose-700",
};

type Props = {
  status: RideStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        statusStyles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
