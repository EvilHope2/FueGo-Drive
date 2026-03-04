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
  const { error } = await service.from("driver_push_subscriptions").upsert(
    {
      driver_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "driver_id,endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: "UPSERT_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
