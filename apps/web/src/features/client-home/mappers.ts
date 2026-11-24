/**
 * Pure client-home mappers.
 * CRITICAL: never merge / average / pick-latest nutrition targets across coaches.
 */
import type {
  CalorieRingMetrics,
  ClientHomeHabit,
  ClientHomeSnapshot,
  CoachChip,
} from "./types"

export const buildCalorieRing = (
  consumedKcal: number,
  targetKcal: number | null
): CalorieRingMetrics => {
  const consumed = Math.max(0, Math.round(consumedKcal))
  if (targetKcal == null || targetKcal <= 0) {
    return {
      consumedKcal: consumed,
      targetKcal: null,
      remainingKcal: null,
      progress: 0,
    }
  }
  const target = Math.round(targetKcal)
  return {
    consumedKcal: consumed,
    targetKcal: target,
    remainingKcal: Math.max(0, target - consumed),
    progress: Math.min(Math.max(consumed / target, 0), 1),
  }
}

/** Resolve focused coach chip — never invent a merge. */
export const selectFocusedCoach = (
  coaches: readonly CoachChip[],
  focusedCoachId: string | null
): CoachChip | null => {
  if (coaches.length === 0) return null
  if (focusedCoachId) {
    const hit = coaches.find((c) => c.coachId === focusedCoachId)
    if (hit) return hit
  }
  // Default: first coach in list order (stable, not "latest updated")
  return coaches[0] ?? null
}

export const ringForFocus = (
  snapshot: Pick<ClientHomeSnapshot, "coaches" | "consumedKcal">,
  focusedCoachId: string | null
): CalorieRingMetrics => {
  const focused = selectFocusedCoach(snapshot.coaches, focusedCoachId)
  return buildCalorieRing(snapshot.consumedKcal, focused?.targetKcal ?? null)
}

/** Habits for focused coach — prefer showing all when multi-coach (chips only switch calorie hero). */
export const filterHabitsForCoach = (
  habits: readonly ClientHomeHabit[],
  focusedCoachId: string | null
): ClientHomeHabit[] => {
  if (!focusedCoachId) return [...habits]
  return habits.filter((h) => h.coachId === focusedCoachId)
}

/** Always show every coach's habits; chips do not scope the list. */
export const habitsForHome = (
  habits: readonly ClientHomeHabit[]
): ClientHomeHabit[] => [...habits]

export const shouldShowCoachesStrip = (coachCount: number): boolean =>
  coachCount > 1

export const habitDoneCount = (habits: readonly ClientHomeHabit[]): {
  done: number
  total: number
} => ({
  done: habits.filter((h) => h.done).length,
  total: habits.length,
})
