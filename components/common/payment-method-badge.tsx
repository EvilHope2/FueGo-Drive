import type { RidePaymentMethod } from "@/lib/types";

type Props = {
  method: RidePaymentMethod | null | undefined;
};

const methodStyles: Record<RidePaymentMethod, { label: string; className: string }> = {
  cash: {
    label: "Efectivo",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  transfer: {
    label: "Transferencia",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export function PaymentMethodBadge({ method }: Props) {
  const safeMethod: RidePaymentMethod = method === "transfer" ? "transfer" : "cash";
  const style = methodStyles[safeMethod];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

