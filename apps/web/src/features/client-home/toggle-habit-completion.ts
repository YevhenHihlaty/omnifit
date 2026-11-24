"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { toCalendarDateIso } from "./calendar-date"

type ToggleResult =
  | { success: true; done: boolean; currentValue: number }
  | { success: false; error: string }

/** Client toggles today's habit completion (boolean-style: 0 ↔ target). */
export const toggleHabitCompletion = async (
  habitId: string,
  timeZone = "UTC"
): Promise<ToggleResult> => {
  if (!habitId) return { success: false, error: "invalid" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data: habit, error: habitErr } = await supabase
    .from("daily_habits")
    .select("id, client_id, target_value, active")
    .eq("id", habitId)
    .maybeSingle()

  if (habitErr || !habit) return { success: false, error: "not_found" }
  if (habit.client_id !== user.id || !habit.active) {
    return { success: false, error: "forbidden" }
  }

  const todayIso = toCalendarDateIso(new Date(), timeZone)
  const target = Number(habit.target_value) || 1

  const { data: existing } = await supabase
    .from("habit_completions")
    .select("id, current_value")
    .eq("habit_id", habitId)
    .eq("completed_on", todayIso)
    .maybeSingle()

  const currentlyDone =
    existing != null && Number(existing.current_value) >= target
  const nextValue = currentlyDone ? 0 : target

  if (existing) {
    const { error } = await supabase
      .from("habit_completions")
      .update({ current_value: nextValue })
      .eq("id", existing.id)
    if (error) return { success: false, error: "update_failed" }
  } else {
    const { error } = await supabase.from("habit_completions").insert({
      habit_id: habitId,
      client_id: user.id,
      completed_on: todayIso,
      current_value: nextValue,
    })
    if (error) return { success: false, error: "insert_failed" }
  }

  revalidatePath(ROUTES.clientHome)
  return {
    success: true,
    done: nextValue >= target,
    currentValue: nextValue,
  }
}
