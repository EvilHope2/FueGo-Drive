import { createClient } from "@/lib/supabase/server";

export async function getHomeCounters() {
  const supabase = await createClient();

  const [{ count: totalDrivers }, { count: totalCustomers }, { count: totalCompletedRides }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "driver"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("rides").select("*", { count: "exact", head: true }).eq("status", "Finalizado"),
  ]);

  return {
    totalDrivers: totalDrivers ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalCompletedRides: totalCompletedRides ?? 0,
  };
}
