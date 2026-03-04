"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";

import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationBanner() {
  const { support, permission, subscribed, busy, subscribe, unsubscribe } = usePushNotifications();

  const activate = async () => {
    const result = await subscribe();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  const deactivate = async () => {
    const result = await unsubscribe();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  if (support === "loading") return null;

  if (support === "unsupported") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Notificaciones push</p>
        <p className="mt-1 text-sm text-slate-600">Tu navegador no soporta notificaciones push. Instalá FueGo en Android/Chrome.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bell className="h-4 w-4 text-indigo-600" />
            Notificaciones de viajes
          </p>
          <p className="mt-1 text-sm text-slate-600">Recibí avisos en tu celular cuando entre un nuevo viaje.</p>
          <p className="mt-1 text-xs text-slate-500">
            Estado: {subscribed ? "activadas" : permission === "denied" ? "bloqueadas por navegador" : "desactivadas"}
          </p>
        </div>
        {subscribed ? (
          <button
            type="button"
            onClick={deactivate}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-70"
          >
            {busy ? "Procesando..." : "Desactivar notificaciones"}
          </button>
        ) : (
          <button
            type="button"
            onClick={activate}
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
          >
            {busy ? "Activando..." : "Activar notificaciones"}
          </button>
        )}
      </div>
    </section>
  );
}
