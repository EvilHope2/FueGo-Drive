import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type UnsubscribeBody = {
  endpoint?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as UnsubscribeBody;
  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "INVALID_ENDPOINT" }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "SERVICE_ROLE_NOT_CONFIGURED" }, { status: 500 });
  }

  const { error } = await service
    .from("driver_push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("driver_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
