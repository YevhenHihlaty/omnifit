"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  mapWorkoutTemplateListRow,
  type WorkoutTemplateListRow,
} from "@/features/log-training/template-mappers"
import type { WorkoutTemplateListItem } from "@/features/log-training/types"

export const loadCoachWorkoutLibrary = async (
  coachId: string
): Promise<{ templates: WorkoutTemplateListItem[]; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
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
    .eq("owner_id", coachId)
    .eq("owner_role", "coach")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(60)

  if (error) {
    return { templates: [], loadFailed: true }
  }

  return {
    templates: ((data ?? []) as WorkoutTemplateListRow[]).map(
      mapWorkoutTemplateListRow
    ),
    loadFailed: false,
  }
}
