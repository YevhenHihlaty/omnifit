"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { coachClientDetail, ROUTES } from "@/lib/routes"

type ActionResult = { success: true } | { success: false; error: string }

export const upsertClientNutritionTarget = async (input: {
  clientId: string
  caloriesKcal: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
}): Promise<ActionResult> => {
  const clientId = input.clientId?.trim()
  const calories = Number(input.caloriesKcal)
  if (!clientId || !Number.isFinite(calories) || calories <= 0) {
    return { success: false, error: "validation" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  // Force coach_id = auth.uid() — never allow writing another coach's row
  const { error } = await supabase.from("client_nutrition_targets").upsert(
    {
      client_id: clientId,
      coach_id: user.id,
      calories_kcal: calories,
      protein_g: input.proteinG ?? null,
      carbs_g: input.carbsG ?? null,
      fat_g: input.fatG ?? null,
    },
    { onConflict: "client_id,coach_id" }
  )

  if (error) return { success: false, error: "forbidden" }

  revalidatePath(coachClientDetail(clientId))
  revalidatePath(ROUTES.clientHome)
  return { success: true }
}

export const createDailyHabit = async (input: {
  clientId: string
  title: string
  targetValue: number
  unit?: "count" | "minutes" | "liters" | "boolean"
  unitLabel?: string | null
}): Promise<ActionResult & { habitId?: string }> => {
  const clientId = input.clientId?.trim()
  const title = input.title?.trim()
  const target = Number(input.targetValue)
  if (!clientId || !title || !Number.isFinite(target) || target <= 0) {
    return { success: false, error: "validation" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("daily_habits")
    .insert({
      client_id: clientId,
      coach_id: user.id,
      title,
      target_value: target,
      unit: input.unit ?? "count",
      unit_label: input.unitLabel ?? null,
      active: true,
    })
    .select("id")
    .maybeSingle()

  if (error || !data) return { success: false, error: "forbidden" }

  revalidatePath(coachClientDetail(clientId))
  revalidatePath(ROUTES.clientHome)
  return { success: true, habitId: String(data.id) }
}

export const archiveDailyHabit = async (input: {
  habitId: string
  clientId: string
}): Promise<ActionResult> => {
  if (!input.habitId) return { success: false, error: "validation" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  // RLS ensures coach_id = auth.uid(); explicit filter too
  const { error, count } = await supabase
    .from("daily_habits")
    .update({ active: false }, { count: "exact" })
    .eq("id", input.habitId)
    .eq("coach_id", user.id)

  if (error) return { success: false, error: "forbidden" }
  if (count === 0) return { success: false, error: "forbidden" }

  revalidatePath(coachClientDetail(input.clientId))
  revalidatePath(ROUTES.clientHome)
  return { success: true }
}
