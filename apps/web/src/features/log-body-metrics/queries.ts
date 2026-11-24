"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { LogBodyMetricsPageData, RecentBodyMetric } from "./types"

export const loadLogBodyMetricsPageData = async (
  userId: string
): Promise<{ data: LogBodyMetricsPageData; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("body_metrics")
    .select("id, logged_at, weight_kg")
    .eq("client_id", userId)
    .order("logged_at", { ascending: false })
    .limit(5)

  if (error) {
    return { data: { recent: [] }, loadFailed: true }
  }

  const recent: RecentBodyMetric[] = (data ?? []).map((row) => ({
    id: row.id,
    loggedAt: row.logged_at,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
  }))

  return { data: { recent }, loadFailed: false }
}
