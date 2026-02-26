import { STATUS_ORDER, type RideStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  status: RideStatus;
};

export function StatusStepper({ status }: Props) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <ol className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {STATUS_ORDER.map((item, index) => {
        const done = currentIndex >= index;
        return (
          <li
            key={item}
            className={cn(
              "rounded-xl border px-2 py-3 text-center text-xs font-medium transition",
              done
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500",
            )}
          >
            {item}
          </li>
        );
      })}
    </ol>
  );
}
