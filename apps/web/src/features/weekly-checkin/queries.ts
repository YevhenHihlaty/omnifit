"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { weekStartSundayIso } from "./week-start"
import {
  emptyScores,
  type WeeklyCheckinPageData,
  type WeeklyCheckinRecord,
  type WeeklyCheckinScores,
} from "./types"

const mapRow = (row: {
  id: string
  week_start: string
  sleep: number | null
  soreness: number | null
  stress: number | null
  energy: number | null
  motivation: number | null
  notes: string | null
}): WeeklyCheckinRecord => ({
  id: row.id,
  weekStart: row.week_start,
  scores: {
    sleep: row.sleep,
    soreness: row.soreness,
    stress: row.stress,
    energy: row.energy,
    motivation: row.motivation,
  },
  notes: row.notes,
})

export const loadWeeklyCheckinPageData = async (
  userId: string,
  timeZone: string
): Promise<{ data: WeeklyCheckinPageData; loadFailed: boolean }> => {
  const weekStart = weekStartSundayIso(new Date(), timeZone)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("weekly_checkins")
    .select(
      "id, week_start, sleep, soreness, stress, energy, motivation, notes"
    )
    .eq("client_id", userId)
    .order("week_start", { ascending: false })
    .limit(12)

  if (error) {
    return {
      data: { weekStart, current: null, history: [] },
      loadFailed: true,
    }
  }

  const history = (data ?? []).map(mapRow)
  const current = history.find((row) => row.weekStart === weekStart) ?? null

  return {
    data: { weekStart, current, history },
    loadFailed: false,
  }
}

export const scoresFromRecord = (
  record: WeeklyCheckinRecord | null
): WeeklyCheckinScores =>
  record ? { ...record.scores } : emptyScores()
