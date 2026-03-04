import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type SubscriptionBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canUseDriverPanel = profile?.role === "driver" || user.user_metadata?.is_driver === true;
  if (!canUseDriverPanel) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as SubscriptionBody;
  const endpoint = body.subscription?.endpoint?.trim();
  const p256dh = body.subscription?.keys?.p256dh?.trim();
  const auth = body.subscription?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "SERVICE_ROLE_NOT_CONFIGURED" }, { status: 500 });
  }

  const userAgent = request.headers.get("user-agent");
  const { data: existing, error: existingError } = await service
    .from("driver_push_subscriptions")
    .select("id")
    .eq("driver_id", user.id)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "LOOKUP_FAILED" }, { status: 500 });
  }

  if (existing?.id) {
    const { error: updateError } = await service
      .from("driver_push_subscriptions")
      .update({
        p256dh,
        auth,
        user_agent: userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
    }
  } else {
    const { error: insertError } = await service.from("driver_push_subscriptions").insert({
      driver_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
