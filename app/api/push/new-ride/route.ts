import { NextResponse } from "next/server";

import { sendNewRidePushNotifications } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type NotifyBody = {
  rideId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as NotifyBody;
  const rideId = body.rideId?.trim();
  if (!rideId) {
    return NextResponse.json({ error: "INVALID_RIDE" }, { status: 400 });
  }

  const { data: ride } = await supabase
    .from("rides")
    .select("id,customer_id,status,from_neighborhood,to_neighborhood,payment_method,estimated_price")
    .eq("id", rideId)
    .single();

  if (!ride || ride.customer_id !== user.id || ride.status !== "Solicitado") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await sendNewRidePushNotifications({
    id: ride.id as string,
    from_neighborhood: (ride.from_neighborhood as string | null) ?? null,
    to_neighborhood: (ride.to_neighborhood as string | null) ?? null,
    payment_method: ((ride.payment_method as "cash" | "transfer") ?? "cash"),
    estimated_price: (ride.estimated_price as number | null) ?? null,
  });

  return NextResponse.json({ ok: true, ...result });
}
