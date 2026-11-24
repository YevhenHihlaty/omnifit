/** Client home types — Sprint 5. No primary coach; per-coach targets stay separate. */

export type HabitUnit = "count" | "minutes" | "liters" | "boolean"

export type CoachChip = {
  coachId: string
  relationshipId: string
  displayName: string
  targetKcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

export type ClientHomeHabit = {
  id: string
  coachId: string
  coachName: string
  title: string
  targetValue: number
  unit: HabitUnit
  unitLabel: string | null
  currentValue: number
  done: boolean
}

export type UpcomingHomeSession = {
  id: string
  title: string
  startsAt: string
  coachName: string
  durationMinutes: number | null
}

export type MessagePreview = {
  id: string
  senderName: string
  preview: string
  at: string
}

export type CalorieRingMetrics = {
  consumedKcal: number
  targetKcal: number | null
  remainingKcal: number | null
  progress: number
}

export type ClientHomeSnapshot = {
  coaches: CoachChip[]
  consumedKcal: number
  consumedProteinG: number
  consumedCarbsG: number
  consumedFatG: number
  habits: ClientHomeHabit[]
  upcomingSession: UpcomingHomeSession | null
  messagesPreview: MessagePreview[]
  checkinDue: boolean
}
