import { mapExerciseRowToWorkoutSetFields } from "./sport-field-registry"
import type { LogTrainingDraft, LogWorkoutInput, WorkoutSource } from "./types"

export const logTrainingDraftToInput = (
  draft: LogTrainingDraft,
  clientId: string,
  source: WorkoutSource = "client_self"
): LogWorkoutInput => {
  const sets = draft.exercises.flatMap((exercise, exerciseIndex) =>
    Array.from({ length: Math.max(1, exercise.sets) }, (_, setIndex) => ({
      exercise_name: exercise.exerciseName,
      sort_order: exerciseIndex * 100 + setIndex,
      ...mapExerciseRowToWorkoutSetFields(exercise),
    }))
  )

  return {
    client_id: clientId,
    sport_type: draft.sportType,
    source,
    duration_sec:
      draft.durationMinutes > 0 ? draft.durationMinutes * 60 : undefined,
    notes: draft.notes.trim().length > 0 ? draft.notes.trim() : undefined,
    sets,
  }
}
