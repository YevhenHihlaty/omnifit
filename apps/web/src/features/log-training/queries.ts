"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  mapWorkoutTemplateListRow,
  type WorkoutTemplateListRow,
} from "./template-mappers"
import type { LogTrainingPageData } from "./types"

export const loadLogTrainingPageData = async (
  userId: string,
  ownerRole?: "coach" | "client"
): Promise<{ data: LogTrainingPageData; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from("workout_templates")
    .select(
      `
      id,
      name,
      sport_type,
      last_used_at,
      workout_template_items ( id )
    `
    )
    .eq("owner_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(40)

  if (ownerRole) {
    query = query.eq("owner_role", ownerRole)
  }

  const { data, error } = await query

  if (error) {
    return { data: { templates: [] }, loadFailed: true }
  }

  return {
    data: {
      templates: ((data ?? []) as WorkoutTemplateListRow[]).map(
        mapWorkoutTemplateListRow
      ),
    },
    loadFailed: false,
  }
}

export const loadWorkoutTemplateDetail = async (templateId: string) => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("workout_templates")
    .select(
      `
      id,
      name,
      sport_type,
      notes,
      workout_template_items (
        id,
        exercise_name,
        sort_order,
        default_sets
      )
    `
    )
    .eq("id", templateId)
    .maybeSingle()

  if (error || !data) return null
  return data
}
