import { createDefaultExerciseRow } from "./sport-field-registry"
import type {
  LogTrainingDraft,
  SportType,
  TrainingExerciseRow,
  WorkoutTemplateListItem,
} from "./types"

export type WorkoutTemplateListRow = {
  id: string
  name: string
  sport_type: SportType
  last_used_at: string | null
  workout_template_items: { id: string }[] | null
}

export type WorkoutTemplateDefaultSets = {
  sets?: number
  reps?: number
  weightKg?: number | null
  durationSec?: number | null
  distanceM?: number | null
}

export type WorkoutTemplateItemRow = {
  id: string
  exercise_name: string
  sort_order: number
  default_sets: WorkoutTemplateDefaultSets | null
}

export type WorkoutTemplateDetailRow = {
  id: string
  name: string
  sport_type: SportType
  notes: string | null
  workout_template_items: WorkoutTemplateItemRow[] | null
}

export const mapWorkoutTemplateListRow = (
  row: WorkoutTemplateListRow
): WorkoutTemplateListItem => ({
  id: row.id,
  name: row.name,
  sportType: row.sport_type,
  exerciseCount: row.workout_template_items?.length ?? 0,
  lastUsedAt: row.last_used_at,
})

const mapTemplateItemToExercise = (
  item: WorkoutTemplateItemRow,
  sportType: SportType
): TrainingExerciseRow => {
  const defaults = item.default_sets
  const base = createDefaultExerciseRow(sportType)

  return {
    ...base,
    id: crypto.randomUUID(),
    exerciseName: item.exercise_name,
    sets: defaults?.sets ?? base.sets,
    reps: defaults?.reps ?? base.reps,
    weightKg: defaults?.weightKg ?? base.weightKg,
    durationSec: defaults?.durationSec ?? base.durationSec,
    distanceM: defaults?.distanceM ?? base.distanceM,
  }
}

export const mapWorkoutTemplateToDraft = (
  row: WorkoutTemplateDetailRow,
  durationMinutes = 45
): LogTrainingDraft => {
  const items = [...(row.workout_template_items ?? [])].sort(
    (left, right) => left.sort_order - right.sort_order
  )

  return {
    sportType: row.sport_type,
    durationMinutes,
    notes: row.notes ?? "",
    exercises: items.map((item) =>
      mapTemplateItemToExercise(item, row.sport_type)
    ),
  }
}

/** Serialize exercise defaults into template_items.default_sets jsonb. */
export const exerciseRowToDefaultSets = (
  row: TrainingExerciseRow
): WorkoutTemplateDefaultSets => ({
  sets: row.sets,
  reps: row.reps ?? undefined,
  weightKg: row.weightKg,
  durationSec: row.durationSec,
  distanceM: row.distanceM,
})
