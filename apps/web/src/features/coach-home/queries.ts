"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type TodaySession = {
  id: string
  clientId: string
  clientName: string
  title: string
  startsAt: string
  durationMinutes: number
  status: string
}

export type CoachDashboardSummary = {
  activeClients: number
  sessionsLast30: number
  avgStreakDays: number
  checkinActivity: {
    thisWeek: number[] // length 7, Mon–Sun
    lastWeek: number[] // length 7, Mon–Sun
  }
  statusCounts: {
    onTrack: number
    atRisk: number
    new: number
  }
  todaySessions: TodaySession[]
}

const toNum = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0))
const toStr = (v: unknown): string => (typeof v === "string" ? v : "")
const toIntArray = (v: unknown): number[] => {
  if (!Array.isArray(v)) return [0, 0, 0, 0, 0, 0, 0]
  const arr = v.map((x) => (typeof x === "number" ? x : Number(x ?? 0)))
  while (arr.length < 7) arr.push(0)
  return arr.slice(0, 7)
}

/**
 * Returns:
 *   CoachDashboardSummary — RPC succeeded
 *   false                 — RPC failed (network/auth/DB error)
 *   null                  — No data yet (0 active clients or p.success !== true)
 */
export const getCoachDashboardSummary = async (
  tz = "UTC"
): Promise<CoachDashboardSummary | false | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_coach_dashboard_summary", {
    p_tz: tz,
  })

  // RPC error → signal failure so UI can show error message
  if (error) return false

  if (!data || typeof data !== "object") return null

  const p = data as Record<string, unknown>
  if (p.success !== true) return null

  const activity = (p.checkin_activity ?? {}) as Record<string, unknown>
  const counts = (p.status_counts ?? {}) as Record<string, unknown>
  const sessions = Array.isArray(p.today_sessions) ? p.today_sessions : []

  return {
    activeClients: toNum(p.active_clients),
    sessionsLast30: toNum(p.sessions_last_30),
    avgStreakDays: toNum(p.avg_streak_days),
    checkinActivity: {
      thisWeek: toIntArray(activity.this_week),
      lastWeek: toIntArray(activity.last_week),
    },
    statusCounts: {
      onTrack: toNum(counts.on_track),
      atRisk: toNum(counts.at_risk),
      new: toNum(counts.new),
    },
    todaySessions: sessions.map((s: Record<string, unknown>) => ({
      id: toStr(s.id),
      clientId: toStr(s.client_id),
      clientName: toStr(s.client_name),
      title: toStr(s.title),
      startsAt: toStr(s.starts_at),
      durationMinutes: toNum(s.duration_minutes),
      status: toStr(s.status),
    })),
  }
}
