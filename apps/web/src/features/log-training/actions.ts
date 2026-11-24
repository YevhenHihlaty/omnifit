"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { coachClientDetail, coachClientLogTraining, ROUTES } from "@/lib/routes"
import { exerciseRowToDefaultSets } from "./template-mappers"
import { logWorkoutSchema, saveTemplateSchema } from "./schemas"
import type { LogTrainingDraft, TrainingExerciseRow } from "./types"
import { loadWorkoutTemplateDetail } from "./queries"
import { mapWorkoutTemplateToDraft } from "./template-mappers"

export type ActionResult =
  | { success: true; workoutId?: string; templateId?: string }
  | { success: false; error: string }

const assertActiveCoachClient = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  coachId: string,
  clientId: string
) => {
  const { data } = await supabase
    .from("coach_client_relationships")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle()
  return Boolean(data)
}

export const saveWorkout = async (input: {
  sportType: string
  durationMinutes: number
  notes?: string
  sets: {
    exercise_name: string
    sort_order: number
    reps?: number
    weight_kg?: number
    duration_sec?: number
    distance_m?: number
    elevation_m?: number
    power_w?: number
    cadence_rpm?: number
    laps?: number
    stroke?: string
    rpe?: number
    rest_sec?: number
    notes?: string
  }[]
  saveAsTemplate?: boolean
  templateName?: string
  /** When set, coach logs for this client (`source=coach_offline`). */
  onBehalfOf?: string
}): Promise<ActionResult> => {
  const parsed = logWorkoutSchema.safeParse({
    sport_type: input.sportType,
    duration_sec:
      input.durationMinutes > 0 ? Math.round(input.durationMinutes * 60) : undefined,
    notes: input.notes,
    sets: input.sets,
    saveAsTemplate: input.saveAsTemplate,
    templateName: input.templateName,
  })

  if (!parsed.success) {
    return { success: false, error: "invalid_input" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const onBehalfOf = input.onBehalfOf?.trim() || undefined
  if (onBehalfOf) {
    const ok = await assertActiveCoachClient(supabase, user.id, onBehalfOf)
    if (!ok) return { success: false, error: "forbidden" }
  }

  const clientId = onBehalfOf ?? user.id
  const source = onBehalfOf ? "coach_offline" : "client_self"
  const ownerRole = onBehalfOf ? "coach" : "client"

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      client_id: clientId,
      logged_by_id: user.id,
      sport_type: parsed.data.sport_type,
      source,
      duration_sec: parsed.data.duration_sec ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single()

  if (workoutError || !workout) {
    return { success: false, error: "save_failed" }
  }

  const { error: setsError } = await supabase.from("workout_sets").insert(
    parsed.data.sets.map((set) => ({
      workout_id: workout.id,
      exercise_name: set.exercise_name,
      sort_order: set.sort_order,
      reps: set.reps ?? null,
      weight_kg: set.weight_kg ?? null,
      duration_sec: set.duration_sec ?? null,
      distance_m: set.distance_m ?? null,
      elevation_m: set.elevation_m ?? null,
      power_w: set.power_w ?? null,
      cadence_rpm: set.cadence_rpm ?? null,
      laps: set.laps ?? null,
      stroke: set.stroke ?? null,
      rpe: set.rpe ?? null,
      rest_sec: set.rest_sec ?? null,
      notes: set.notes ?? null,
    }))
  )

  if (setsError) {
    await supabase
      .from("workouts")
      .delete()
      .eq("id", workout.id)
      .eq("client_id", clientId)
    return { success: false, error: "save_failed" }
  }

  if (parsed.data.saveAsTemplate && parsed.data.templateName) {
    await saveWorkoutTemplateInternal(user.id, {
      name: parsed.data.templateName,
      sport_type: parsed.data.sport_type,
      notes: parsed.data.notes,
      owner_role: ownerRole,
      items: collapseSetsToTemplateItems(parsed.data.sets),
    })
  }

  if (onBehalfOf) {
    revalidatePath(coachClientDetail(onBehalfOf))
    revalidatePath(coachClientLogTraining(onBehalfOf))
    revalidatePath(ROUTES.programs)
  } else {
    revalidatePath(ROUTES.clientLogTraining)
    revalidatePath(ROUTES.clientProgress)
    revalidatePath(ROUTES.clientHome)
  }
  return { success: true, workoutId: workout.id }
}

const collapseSetsToTemplateItems = (
  sets: {
    exercise_name: string
    sort_order: number
    reps?: number
    weight_kg?: number
    duration_sec?: number
    distance_m?: number
  }[]
) => {
  const byName = new Map<
    string,
    {
      exercise_name: string
      sort_order: number
      setCount: number
      reps?: number
      weight_kg?: number
      duration_sec?: number
      distance_m?: number
    }
  >()

  for (const set of sets) {
    const existing = byName.get(set.exercise_name)
    if (!existing) {
      byName.set(set.exercise_name, {
        exercise_name: set.exercise_name,
        sort_order: set.sort_order,
        setCount: 1,
        reps: set.reps,
        weight_kg: set.weight_kg,
        duration_sec: set.duration_sec,
        distance_m: set.distance_m,
      })
    } else {
      byName.set(set.exercise_name, {
        ...existing,
        setCount: existing.setCount + 1,
      })
    }
  }

  return [...byName.values()].map((item, index) => ({
    exercise_name: item.exercise_name,
    sort_order: index,
    default_sets: {
      sets: item.setCount,
      reps: item.reps,
      weightKg: item.weight_kg ?? null,
      durationSec: item.duration_sec ?? null,
      distanceM: item.distance_m ?? null,
    },
  }))
}

const saveWorkoutTemplateInternal = async (
  userId: string,
  input: {
    name: string
    sport_type: string
    notes?: string
    owner_role?: "coach" | "client"
    items: {
      exercise_name: string
      sort_order: number
      default_sets?: Record<string, unknown>
    }[]
  }
): Promise<ActionResult> => {
  const parsed = saveTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "invalid_input" }
  }

  const supabase = await createSupabaseServerClient()
  const { data: template, error } = await supabase
    .from("workout_templates")
    .insert({
      owner_id: userId,
      owner_role: input.owner_role ?? "client",
      name: parsed.data.name,
      sport_type: parsed.data.sport_type,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single()

  if (error || !template) {
    return { success: false, error: "save_failed" }
  }

  const { error: itemsError } = await supabase
    .from("workout_template_items")
    .insert(
      parsed.data.items.map((item) => ({
        template_id: template.id,
        exercise_name: item.exercise_name,
        sort_order: item.sort_order,
        default_sets: item.default_sets ?? null,
      }))
    )

  if (itemsError) {
    await supabase
      .from("workout_templates")
      .delete()
      .eq("id", template.id)
      .eq("owner_id", userId)
    return { success: false, error: "save_failed" }
  }

  return { success: true, templateId: template.id }
}

export const saveAsTemplate = async (input: {
  name: string
  sportType: string
  notes?: string
  exercises: TrainingExerciseRow[]
  ownerRole?: "coach" | "client"
}): Promise<ActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const ownerRole = input.ownerRole ?? "client"
  const result = await saveWorkoutTemplateInternal(user.id, {
    name: input.name,
    sport_type: input.sportType,
    notes: input.notes,
    owner_role: ownerRole,
    items: input.exercises.map((row, index) => ({
      exercise_name: row.exerciseName,
      sort_order: index,
      default_sets: exerciseRowToDefaultSets(row) as Record<string, unknown>,
    })),
  })

  if (result.success) {
    revalidatePath(
      ownerRole === "coach" ? ROUTES.programs : ROUTES.clientLogTraining
    )
  }

  return result
}

export const loadTemplateAsDraft = async (
  templateId: string
): Promise<
  { success: true; draft: LogTrainingDraft } | { success: false; error: string }
> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const detail = await loadWorkoutTemplateDetail(templateId)
  if (!detail) {
    return { success: false, error: "template_not_found" }
  }

  await supabase
    .from("workout_templates")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("owner_id", user.id)

  return {
    success: true,
    draft: mapWorkoutTemplateToDraft(detail),
  }
}

export const deleteWorkoutTemplate = async (
  templateId: string
): Promise<ActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", templateId)
    .eq("owner_id", user.id)

  if (error) return { success: false, error: "save_failed" }
  revalidatePath(ROUTES.programs)
  revalidatePath(ROUTES.clientLogTraining)
  return { success: true }
}
