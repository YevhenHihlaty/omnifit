/** Sport types match `public.sport_type` (migration 012). */
export const SPORT_TYPES = [
  "weight_lifting",
  "general_fitness",
  "running",
  "cycling",
  "swimming",
] as const

export type SportType = (typeof SPORT_TYPES)[number]

export const WORKOUT_SOURCES = [
  "client_self",
  "coach_offline",
  "live_session",
] as const

export type WorkoutSource = (typeof WORKOUT_SOURCES)[number]

export type TrainingExerciseRow = {
  id: string
  exerciseName: string
  sets: number
  reps: number | null
  weightKg: number | null
  durationSec: number | null
  distanceM: number | null
  elevationM: number | null
  powerW: number | null
  cadenceRpm: number | null
  laps: number | null
  stroke: string | null
  rpe: number | null
  restSec: number | null
  setNotes: string | null
}

export type LogTrainingDraft = {
  sportType: SportType
  durationMinutes: number
  notes: string
  exercises: TrainingExerciseRow[]
}

export type WorkoutSetFieldKey =
  | "reps"
  | "weight_kg"
  | "duration_sec"
  | "distance_m"
  | "elevation_m"
  | "power_w"
  | "cadence_rpm"
  | "laps"
  | "stroke"
  | "rpe"
  | "rest_sec"
  | "notes"

export type WorkoutSetInput = {
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
}

export type LogWorkoutInput = {
  client_id: string
  sport_type: SportType
  source: WorkoutSource
  duration_sec?: number
  notes?: string
  sets: WorkoutSetInput[]
}

export type WorkoutTemplateListItem = {
  id: string
  name: string
  sportType: SportType
  exerciseCount: number
  lastUsedAt: string | null
}

export type LogTrainingPageData = {
  templates: WorkoutTemplateListItem[]
}
