import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  className?: string;
};

export function WhatsAppFixedButton({ href, label, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "fixed bottom-4 left-4 right-4 z-30 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 md:left-auto md:right-8 md:w-auto",
        className,
      )}
    >
      <MessageCircle size={20} />
      {label}
    </a>
  );
}
