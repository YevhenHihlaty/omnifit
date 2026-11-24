/** Types for the coach-clients feature (Sprint 4 roster + snapshot). */

export type StatusBucket = "new" | "at_risk" | "on_track"

export interface CoachClientRow {
  relationshipId: string
  clientId: string
  displayName: string
  avatarUrl: string | null
  email: string
  status: "active" | "archived"
  since: string
  /** null when archived */
  caloriesToday: number | null
  /** null when archived */
  workoutsToday: number | null
  /** null when archived */
  lastCheckinOn: string | null
  /** null when archived */
  lastLogOn: string | null
  /** null when archived */
  streakDays: number | null
  /** null when archived */
  statusBucket: StatusBucket | null
}

// ── Snapshot sub-shapes ────────────────────────────────────────────────────

export interface SnapshotClient {
  clientId: string
  displayName: string
  avatarUrl: string | null
  email: string
  goal: string | null
  since: string
  statusBucket: StatusBucket | null
}

export interface SnapshotStats {
  streakDays: number
  weightChangeKg: number | null
  adherencePct: number
  sessionsCompleted: number
  sessionsTotal: number
}

export interface SnapshotCalories {
  consumedKcal: number
  targetKcal: number | null
}

export interface SnapshotHabit {
  habitId: string
  title: string
  targetValue: number
  unit: string
  unitLabel: string | null
  currentValue: number
  done: boolean
}

export interface WeightPoint {
  on: string
  weightKg: number
}

export interface CheckinPoint {
  weekStart: string
  score: number | null
  present: boolean
}

export interface ActivityItem {
  kind: string
  label: string
  at: string
  attributedTo: string
}

export interface UpcomingSession {
  id: string
  title: string | null
  startsAt: string
  durationMinutes: number | null
}

export interface CoachNote {
  id: string
  body: string
  updatedAt: string
}

export interface ClientSnapshot {
  client: SnapshotClient
  stats: SnapshotStats
  calories: SnapshotCalories
  habits: SnapshotHabit[]
  weightTrend: WeightPoint[]
  checkins: CheckinPoint[]
  recentActivity: ActivityItem[]
  upcomingSession: UpcomingSession | null
  coachNote: CoachNote | null
}
