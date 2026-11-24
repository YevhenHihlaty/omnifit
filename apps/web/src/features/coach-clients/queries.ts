"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { parseRosterPayload } from "./parse-roster-payload"
import type { CoachClientRow, ClientSnapshot } from "./types"

export const listCoachClients = async (params?: {
  status?: "active" | "archived" | "all"
  search?: string
  tz?: string
}): Promise<CoachClientRow[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("list_coach_clients", {
    p_status: params?.status ?? "active",
    p_search: params?.search ?? null,
    p_tz: params?.tz ?? "UTC",
  })
  if (error || !data) return []
  return parseRosterPayload(data)
}

type SnapshotResult =
  | { success: true; snapshot: ClientSnapshot }
  | { success: false; error: string }

const toStr = (v: unknown): string => (typeof v === "string" ? v : "")
const toNum = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0))
const toNumOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const toStrOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null

export const getCoachClientSnapshot = async (
  clientId: string,
  tz = "UTC"
): Promise<SnapshotResult> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_coach_client_snapshot", {
    p_client_id: clientId,
    p_tz: tz,
  })

  if (error) return { success: false, error: error.message }
  if (!data || typeof data !== "object") return { success: false, error: "no_data" }

  const p = data as Record<string, unknown>
  if (p.success !== true) {
    return { success: false, error: toStr(p.error) || "rpc_error" }
  }

  const client = p.client as Record<string, unknown>
  const stats = p.stats as Record<string, unknown>
  const cal = p.calories as Record<string, unknown>
  const upcoming = p.upcoming_session as Record<string, unknown> | null
  const note = p.coach_note as Record<string, unknown> | null
  const bucket = client.status_bucket
  const validBucket =
    bucket === "on_track" || bucket === "at_risk" || bucket === "new" ? bucket : null

  const snapshot: ClientSnapshot = {
    client: {
      clientId: toStr(client.client_id),
      displayName: toStr(client.display_name),
      avatarUrl: toStrOrNull(client.avatar_url),
      email: toStr(client.email),
      goal: toStrOrNull(client.goal),
      since: toStr(client.since),
      statusBucket: validBucket,
    },
    stats: {
      streakDays: toNum(stats.streak_days),
      weightChangeKg: toNumOrNull(stats.weight_change_kg),
      adherencePct: toNum(stats.adherence_pct),
      sessionsCompleted: toNum(stats.sessions_completed),
      sessionsTotal: toNum(stats.sessions_total),
    },
    calories: {
      consumedKcal: toNum(cal.consumed_kcal),
      targetKcal: toNumOrNull(cal.target_kcal),
    },
    habits: Array.isArray(p.habits)
      ? (p.habits as Record<string, unknown>[]).map((h) => ({
          habitId: toStr(h.habit_id),
          title: toStr(h.title),
          targetValue: toNum(h.target_value),
          unit: toStr(h.unit),
          unitLabel: typeof h.unit_label === "string" ? h.unit_label : null,
          currentValue: toNum(h.current_value),
          done: h.done === true,
        }))
      : [],
    weightTrend: Array.isArray(p.weight_trend)
      ? (p.weight_trend as Record<string, unknown>[]).map((w) => ({
          on: toStr(w.on),
          weightKg: toNum(w.weight_kg),
        }))
      : [],
    checkins: Array.isArray(p.checkins)
      ? (p.checkins as Record<string, unknown>[]).map((c) => ({
          weekStart: toStr(c.week_start),
          score: toNumOrNull(c.score),
          present: c.present === true,
        }))
      : [],
    recentActivity: Array.isArray(p.recent_activity)
      ? (p.recent_activity as Record<string, unknown>[]).map((a) => ({
          kind: toStr(a.kind),
          label: toStr(a.label),
          at: toStr(a.at),
          attributedTo: toStr(a.attributed_to),
        }))
      : [],
    upcomingSession: upcoming
      ? {
          id: toStr(upcoming.id),
          title: toStrOrNull(upcoming.title),
          startsAt: toStr(upcoming.starts_at),
          durationMinutes: toNumOrNull(upcoming.duration_minutes),
        }
      : null,
    coachNote: note
      ? {
          id: toStr(note.id),
          body: toStr(note.body),
          updatedAt: toStr(note.updated_at),
        }
      : null,
  }

  return { success: true, snapshot }
}
