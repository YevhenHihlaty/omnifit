"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { listClientCoachesForUser } from "@/features/client-settings/list-client-coaches"
import { getTodayMealTotals } from "@/features/log-meal/queries"
import { weekStartSundayIso } from "@/features/weekly-checkin/week-start"
import { toCalendarDateIso } from "./calendar-date"
import type {
  ClientHomeHabit,
  ClientHomeSnapshot,
  CoachChip,
  HabitUnit,
  MessagePreview,
  UpcomingHomeSession,
} from "./types"
import { formatMessagePreview } from "@/features/messaging/format-message-preview"
import type { ListConversationInboxRpcResult } from "@/features/messaging/types"

const HABIT_UNITS: HabitUnit[] = ["count", "minutes", "liters", "boolean"]

const toHabitUnit = (v: unknown): HabitUnit =>
  HABIT_UNITS.includes(v as HabitUnit) ? (v as HabitUnit) : "count"

const toNumOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Load client home snapshot via RLS-scoped selects.
 * ponytail: no merge RPC — each coach target stays on its chip.
 */
export const getClientHomeSnapshot = async (
  tz = "UTC"
): Promise<ClientHomeSnapshot> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      coaches: [],
      consumedKcal: 0,
      consumedProteinG: 0,
      consumedCarbsG: 0,
      consumedFatG: 0,
      habits: [],
      upcomingSession: null,
      messagesPreview: [],
      checkinDue: false,
    }
  }

  const coaches = await listClientCoachesForUser()
  const coachIds = coaches.map((c) => c.coachId)
  const coachNameById = new Map(coaches.map((c) => [c.coachId, c.displayName]))

  // Today in client TZ (YYYY-MM-DD) — must match toggleHabitCompletion
  const todayIso = toCalendarDateIso(new Date(), tz)
  const weekStart = weekStartSundayIso(new Date(), tz)

  const [targetsRes, habitsRes, sessionRes, checkinRes] = await Promise.all([
    coachIds.length > 0
      ? supabase
          .from("client_nutrition_targets")
          .select("coach_id, calories_kcal, protein_g, carbs_g, fat_g")
          .eq("client_id", user.id)
          .in("coach_id", coachIds)
      : Promise.resolve({ data: [], error: null }),
    coachIds.length > 0
      ? supabase
          .from("daily_habits")
          .select(
            "id, coach_id, title, target_value, unit, unit_label, sort_order, habit_completions(current_value, completed_on)"
          )
          .eq("client_id", user.id)
          .eq("active", true)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("sessions")
      .select("id, title, starts_at, duration_minutes, coach_id, status")
      .eq("client_id", user.id)
      .gte("starts_at", new Date().toISOString())
      .not("status", "in", "(cancelled,completed)")
      .order("starts_at", { ascending: true })
      .limit(1),
    supabase
      .from("weekly_checkins")
      .select("id")
      .eq("client_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ])

  const targetByCoach = new Map<
    string,
    { kcal: number; proteinG: number | null; carbsG: number | null; fatG: number | null }
  >()
  for (const row of targetsRes.data ?? []) {
    const r = row as Record<string, unknown>
    const cid = String(r.coach_id ?? "")
    if (!cid) continue
    targetByCoach.set(cid, {
      kcal: Number(r.calories_kcal) || 0,
      proteinG: toNumOrNull(r.protein_g),
      carbsG: toNumOrNull(r.carbs_g),
      fatG: toNumOrNull(r.fat_g),
    })
  }

  const coachChips: CoachChip[] = coaches.map((c) => {
    const t = targetByCoach.get(c.coachId)
    return {
      coachId: c.coachId,
      relationshipId: c.relationshipId,
      displayName: c.displayName,
      targetKcal: t?.kcal ?? null,
      proteinG: t?.proteinG ?? null,
      carbsG: t?.carbsG ?? null,
      fatG: t?.fatG ?? null,
    }
  })

  const habits: ClientHomeHabit[] = []
  for (const raw of habitsRes.data ?? []) {
    const h = raw as Record<string, unknown>
    const coachId = String(h.coach_id ?? "")
    if (!coachIds.includes(coachId)) continue
    const completions = Array.isArray(h.habit_completions)
      ? (h.habit_completions as Record<string, unknown>[])
      : []
    const today = completions.find((c) => String(c.completed_on) === todayIso)
    const currentValue = today ? Number(today.current_value ?? 0) : 0
    const targetValue = Number(h.target_value ?? 0)
    habits.push({
      id: String(h.id),
      coachId,
      coachName: coachNameById.get(coachId) ?? "Coach",
      title: String(h.title ?? ""),
      targetValue,
      unit: toHabitUnit(h.unit),
      unitLabel: typeof h.unit_label === "string" ? h.unit_label : null,
      currentValue,
      done: currentValue >= targetValue && targetValue > 0,
    })
  }

  const todayMacros = await getTodayMealTotals(user.id, tz)
  const consumedKcal = todayMacros.caloriesKcal
  const consumedProteinG = todayMacros.proteinG
  const consumedCarbsG = todayMacros.carbsG
  const consumedFatG = todayMacros.fatG

  let upcomingSession: UpcomingHomeSession | null = null
  const sess = (sessionRes.data ?? [])[0] as Record<string, unknown> | undefined
  if (sess) {
    const coachId = String(sess.coach_id ?? "")
    upcomingSession = {
      id: String(sess.id),
      title: String(sess.title ?? "Session"),
      startsAt: String(sess.starts_at),
      coachName: coachNameById.get(coachId) ?? "Coach",
      durationMinutes: toNumOrNull(sess.duration_minutes),
    }
  }

  return {
    coaches: coachChips,
    consumedKcal,
    consumedProteinG,
    consumedCarbsG,
    consumedFatG,
    habits,
    upcomingSession,
    messagesPreview: await loadMessagesPreview(supabase),
    checkinDue: !checkinRes.data,
  }
}

const loadMessagesPreview = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<MessagePreview[]> => {
  const { data, error } = await supabase.rpc("list_conversation_inbox")
  if (error) return []
  const payload = data as ListConversationInboxRpcResult
  if (!payload?.success) return []
  return (payload.items ?? [])
    .filter((item) => item.last_message_body)
    .slice(0, 3)
    .map((item) => ({
      id: item.conversation_id,
      senderName: item.counterpart_name ?? "",
      preview: formatMessagePreview(item.last_message_body, ""),
      at: item.last_message_at ?? item.conversation_id,
    }))
}
