import { Loader2 } from "lucide-react";

type Props = {
  label?: string;
};

export function LoadingState({ label = "Cargando..." }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

