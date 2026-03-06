import { createClient } from "@/lib/supabase/client";

type AdminAuditInput = {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(input: AdminAuditInput) {
  try {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData.user?.id;
    if (!adminId) return;

    await supabase.from("admin_action_logs").insert({
      admin_id: adminId,
      action_type: input.actionType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit logs must not break admin operations.
  }
}
