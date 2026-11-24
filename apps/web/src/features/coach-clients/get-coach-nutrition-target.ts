"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type CoachNutritionTarget = {
  caloriesKcal: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

/** This coach's nutrition target for a client (class B). */
export const getCoachNutritionTarget = async (
  clientId: string
): Promise<CoachNutritionTarget | null> => {
  if (!clientId) return null
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("client_nutrition_targets")
    .select("calories_kcal, protein_g, carbs_g, fat_g")
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .maybeSingle()

  if (!data) return null
  const kcal = Number(data.calories_kcal)
  if (!Number.isFinite(kcal) || kcal <= 0) return null
  return {
    caloriesKcal: kcal,
    proteinG: data.protein_g != null ? Number(data.protein_g) : null,
    carbsG: data.carbs_g != null ? Number(data.carbs_g) : null,
    fatG: data.fat_g != null ? Number(data.fat_g) : null,
  }
}
