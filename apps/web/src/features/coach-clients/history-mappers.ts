/** Pure history mappers for coach client History tab (Sprint 8). */

export type HistoryKind = "food" | "training" | "metrics"
export type HistoryFilter = "all" | HistoryKind

export type HistoryEntry = {
  id: string
  kind: HistoryKind
  occurredAt: string
  title: string
  subtitle: string
  attribution: string | null
}

export type HistoryGroup = {
  dateKey: string
  heading: string
  entries: HistoryEntry[]
}

export type HistoryLabels = {
  today: string
  yesterday: string
  daysAgo: string
  mealTypes: Record<string, string>
  sportTypes: Record<string, string>
  loggedMeal: string
  completedWorkout: string
  trainingExercises: string
  trainingMinutes: string
  kcalUnit: string
  metricsWeight: string
  metricsWeightValue: string
  loggedBy: string
  loggedBySelf: string
  loggedByCoach: string
  withCoach: string
}

export type HistoryMealRow = {
  id: string
  meal_type: string
  logged_at: string
  calories?: number | null
}

export type HistoryWorkoutRow = {
  id: string
  sport_type: string
  logged_at: string
  duration_sec: number | null
  set_count: number
  source: string
  logged_by_name: string | null
  session_coach_name: string | null
}

export type HistoryMetricsRow = {
  id: string
  logged_at: string
  weight_kg: number | null
}

export const localDateKey = (iso: string) => {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const formatHistoryGroupHeading = (
  dateKey: string,
  now: Date,
  labels: Pick<HistoryLabels, "today" | "yesterday" | "daysAgo">
) => {
  const todayKey = localDateKey(now.toISOString())
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterdayKey = localDateKey(y.toISOString())
  if (dateKey === todayKey) return labels.today
  if (dateKey === yesterdayKey) return labels.yesterday
  const days = Math.round(
    (Date.parse(todayKey) - Date.parse(dateKey)) / 86_400_000
  )
  if (days > 1 && days < 14) {
    return labels.daysAgo.replace("{n}", String(days))
  }
  try {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateKey
  }
}

export const workoutAttribution = (
  row: Pick<
    HistoryWorkoutRow,
    "source" | "logged_by_name" | "session_coach_name"
  >,
  labels: Pick<
    HistoryLabels,
    "loggedBy" | "loggedBySelf" | "loggedByCoach" | "withCoach"
  >
): string | null => {
  const parts: string[] = []
  if (row.source === "coach_offline") {
    parts.push(
      row.logged_by_name
        ? labels.loggedBy.replace("{name}", row.logged_by_name)
        : labels.loggedByCoach
    )
  } else if (row.source === "client_self") {
    parts.push(labels.loggedBySelf)
  } else if (row.source === "live_session") {
    if (row.logged_by_name) {
      parts.push(labels.loggedBy.replace("{name}", row.logged_by_name))
    } else {
      parts.push(labels.loggedByCoach)
    }
  }
  if (row.session_coach_name) {
    parts.push(labels.withCoach.replace("{name}", row.session_coach_name))
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

export const buildHistoryEntries = (
  meals: HistoryMealRow[],
  workouts: HistoryWorkoutRow[],
  metrics: HistoryMetricsRow[],
  labels: HistoryLabels
): HistoryEntry[] => {
  const entries: HistoryEntry[] = [
    ...meals.map((row) => ({
      id: `meal-${row.id}`,
      kind: "food" as const,
      occurredAt: row.logged_at,
      title: labels.loggedMeal.replace(
        "{meal}",
        labels.mealTypes[row.meal_type] ?? row.meal_type
      ),
      subtitle:
        row.calories != null
          ? `${Math.round(row.calories)} ${labels.kcalUnit}`
          : "",
      attribution: null,
    })),
    ...workouts.map((row) => {
      const durationMin =
        row.duration_sec && row.duration_sec > 0
          ? Math.round(row.duration_sec / 60)
          : null
      const sport = labels.sportTypes[row.sport_type] ?? row.sport_type
      const parts = [
        sport,
        row.set_count > 0
          ? labels.trainingExercises.replace("{n}", String(row.set_count))
          : null,
        durationMin
          ? labels.trainingMinutes.replace("{n}", String(durationMin))
          : null,
      ].filter(Boolean)
      return {
        id: `workout-${row.id}`,
        kind: "training" as const,
        occurredAt: row.logged_at,
        title: labels.completedWorkout,
        subtitle: parts.join(" · "),
        attribution: workoutAttribution(row, labels),
      }
    }),
    ...metrics.map((row) => ({
      id: `metrics-${row.id}`,
      kind: "metrics" as const,
      occurredAt: row.logged_at,
      title: labels.metricsWeight,
      subtitle:
        row.weight_kg != null
          ? labels.metricsWeightValue.replace("{value}", String(row.weight_kg))
          : "",
      attribution: null,
    })),
  ]
  return entries.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

export const filterHistoryEntries = (
  entries: HistoryEntry[],
  filter: HistoryFilter
) => (filter === "all" ? entries : entries.filter((e) => e.kind === filter))

export const groupHistoryEntries = (
  entries: HistoryEntry[],
  now: Date,
  labels: Pick<HistoryLabels, "today" | "yesterday" | "daysAgo">
): HistoryGroup[] => {
  const groups = new Map<string, HistoryEntry[]>()
  for (const entry of entries) {
    const key = localDateKey(entry.occurredAt)
    const bucket = groups.get(key) ?? []
    bucket.push(entry)
    groups.set(key, bucket)
  }
  return [...groups.entries()].map(([dateKey, groupEntries]) => ({
    dateKey,
    heading: formatHistoryGroupHeading(dateKey, now, labels),
    entries: groupEntries,
  }))
}
