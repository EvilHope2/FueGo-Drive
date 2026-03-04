import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { createServiceClient } from "@/lib/supabase/service";

type RidePushPayload = {
  id: string;
  from_neighborhood: string | null;
  to_neighborhood: string | null;
  payment_method: "cash" | "transfer";
  estimated_price: number | null;
};

type StoredSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function buildBody(ride: RidePushPayload) {
  const from = ride.from_neighborhood ?? "Origen";
  const to = ride.to_neighborhood ?? "Destino";
  const payment = ride.payment_method === "cash" ? "Efectivo" : "Transferencia";
  const estimated = ride.estimated_price ? ` | Estimado: $${Math.round(ride.estimated_price)}` : "";
  return `${from} -> ${to} | Pago: ${payment}${estimated}`;
}

export async function sendNewRidePushNotifications(ride: RidePushPayload) {
  if (!configureWebPush()) {
    return { sent: 0, inactive: 0, reason: "VAPID_NOT_CONFIGURED" as const };
  }

  const service = createServiceClient();
  if (!service) {
    return { sent: 0, inactive: 0, reason: "SERVICE_ROLE_NOT_CONFIGURED" as const };
  }

  let driversQuery = await service
    .from("profiles")
    .select("id")
    .or("role.eq.driver,is_driver.eq.true")
    .neq("driver_account_status", "suspended_debt");

  if (driversQuery.error) {
    driversQuery = await service
      .from("profiles")
      .select("id")
      .eq("role", "driver")
      .neq("driver_account_status", "suspended_debt");
  }

  const { data: drivers } = driversQuery;

  const driverIds = (drivers ?? []).map((item) => item.id as string);
  if (driverIds.length === 0) {
    return { sent: 0, inactive: 0, reason: "NO_DRIVERS" as const };
  }

  const { data: subscriptions } = await service
    .from("driver_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("is_active", true)
    .in("driver_id", driverIds);

  const rows = (subscriptions ?? []) as StoredSubscriptionRow[];
  if (rows.length === 0) {
    return { sent: 0, inactive: 0, reason: "NO_SUBSCRIPTIONS" as const };
  }

  const payload = JSON.stringify({
    title: "Nuevo viaje disponible",
    body: buildBody(ride),
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: "/driver",
    rideId: ride.id,
  });

  let sent = 0;
  const invalidIds: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      const sub: WebPushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(sub, payload);
        sent += 1;
      } catch (error: unknown) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          invalidIds.push(row.id);
        }
      }
    }),
  );

  if (invalidIds.length > 0) {
    await service.from("driver_push_subscriptions").update({ is_active: false }).in("id", invalidIds);
  }

  return { sent, inactive: invalidIds.length, reason: "OK" as const };
}
