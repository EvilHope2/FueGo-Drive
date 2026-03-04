"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { urlBase64ToUint8Array } from "@/lib/push-client";

type PushSupport = "loading" | "supported" | "unsupported";

export function usePushNotifications() {
  const [support, setSupport] = useState<PushSupport>("loading");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!isSupported || !vapidPublicKey) {
      setSupport("unsupported");
      return;
    }

    setSupport("supported");
    setPermission(Notification.permission);

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => setSubscribed(false));
  }, [vapidPublicKey]);

  const subscribe = useCallback(async () => {
    if (support !== "supported") return { ok: false, message: "Tu navegador no soporta notificaciones push." };
    if (!vapidPublicKey) return { ok: false, message: "Falta configurar VAPID público." };

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      if (currentPermission !== "granted") {
        return { ok: false, message: "Debés permitir notificaciones para activar avisos." };
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        return { ok: false, message: "No se pudo guardar la suscripción push." };
      }

      setSubscribed(true);
      return { ok: true, message: "Notificaciones activadas." };
    } catch {
      return { ok: false, message: "No se pudieron activar las notificaciones." };
    } finally {
      setBusy(false);
    }
  }, [support, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (support !== "supported") return { ok: false, message: "Tu navegador no soporta notificaciones push." };

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setSubscribed(false);
        return { ok: true, message: "Notificaciones desactivadas." };
      }

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setSubscribed(false);
      return { ok: true, message: "Notificaciones desactivadas." };
    } catch {
      return { ok: false, message: "No se pudieron desactivar las notificaciones." };
    } finally {
      setBusy(false);
    }
  }, [support]);

  return useMemo(
    () => ({ support, permission, subscribed, busy, subscribe, unsubscribe }),
    [support, permission, subscribed, busy, subscribe, unsubscribe],
  );
}
