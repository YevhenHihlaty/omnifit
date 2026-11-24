/**
 * Pure helpers: status bucket labels + activity subtitle for a roster row.
 * No I/O — safe to test without mocks.
 */
import type { StatusBucket } from "./types"

export const BUCKET_VARIANTS = {
  on_track: "active",
  at_risk: "warning",
  new: "new",
} as const satisfies Record<StatusBucket, "active" | "warning" | "new">

/**
 * Map a status bucket to a translated label key.
 * The caller must resolve the key via t().
 */
export const bucketLabelKey = (bucket: StatusBucket): string => {
  const keys: Record<StatusBucket, string> = {
    on_track: "coachClients.bucket.onTrack",
    at_risk: "coachClients.bucket.atRisk",
    new: "coachClients.bucket.new",
  }
  return keys[bucket]
}

/**
 * Returns how many days since a given ISO date string relative to todayIso.
 * Returns null if dateIso is null.
 */
export const daysSince = (dateIso: string | null, todayIso: string): number | null => {
  if (!dateIso) return null
  const diff = new Date(todayIso).getTime() - new Date(dateIso).getTime()
  return Math.floor(diff / 86_400_000)
}

/**
 * Build the activity subtitle line shown beneath a client name in the roster.
 * Examples:
 *   "1,840 cal today · 1 workout"
 *   "No check-in in 6 days"
 *   "No activity today"
 *   "Joined 3 days ago" (new bucket)
 */
export const buildActivitySubtitle = (params: {
  caloriesToday: number | null
  workoutsToday: number | null
  lastCheckinOn: string | null
  lastLogOn: string | null
  todayIso: string
  statusBucket?: string | null
  since?: string | null
  t: (key: string, vars?: Record<string, string | number>) => string
}): string => {
  const { caloriesToday, workoutsToday, lastCheckinOn, lastLogOn, todayIso, statusBucket, since, t } = params

  // Archived → no activity
  if (caloriesToday === null && lastCheckinOn === null && lastLogOn === null) {
    return t("coachClients.activity.archived")
  }

  const today = new Date(todayIso)

  // New bucket with a join date → "Joined N days ago"
  if (statusBucket === "new" && since) {
    const days = daysSince(since, todayIso)
    if (days !== null) {
      return t("coachClients.activity.joinedDaysAgo", { days })
    }
  }

  // "No check-in in N days" takes priority when check-in is stale
  if (lastCheckinOn) {
    const lastCheckin = new Date(lastCheckinOn)
    const diffMs = today.getTime() - lastCheckin.getTime()
    const diffDays = Math.floor(diffMs / 86_400_000)
    if (diffDays >= 6) {
      return t("coachClients.activity.noCheckinDays", { days: diffDays })
    }
  } else if (lastLogOn === null) {
    // no activity at all
    return t("coachClients.activity.noActivityToday")
  }

  const cals = caloriesToday ?? 0
  const workouts = workoutsToday ?? 0

  if (cals === 0 && workouts === 0) {
    return t("coachClients.activity.noActivityToday")
  }

  const calStr = cals > 0
    ? t("coachClients.activity.calToday", { cal: cals.toLocaleString() })
    : null
  const workoutStr = workouts > 0
    ? t(
        workouts === 1
          ? "coachClients.activity.workoutToday"
          : "coachClients.activity.workoutTodayOther",
        { count: workouts }
      )
    : cals > 0
      ? t("coachClients.activity.restDay")
      : null

  const parts = [calStr, workoutStr].filter(Boolean)
  return parts.join(" · ")
}
