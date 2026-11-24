export const CHECKIN_METRICS = [
  "sleep",
  "soreness",
  "stress",
  "energy",
  "motivation",
] as const

export type CheckinMetric = (typeof CHECKIN_METRICS)[number]

export type WeeklyCheckinScores = Record<CheckinMetric, number | null>

export type WeeklyCheckinRecord = {
  id: string
  weekStart: string
  scores: WeeklyCheckinScores
  notes: string | null
}

export type WeeklyCheckinPageData = {
  weekStart: string
  current: WeeklyCheckinRecord | null
  history: WeeklyCheckinRecord[]
}

export const emptyScores = (): WeeklyCheckinScores => ({
  sleep: null,
  soreness: null,
  stress: null,
  energy: null,
  motivation: null,
})

export const isCheckinComplete = (scores: WeeklyCheckinScores): boolean =>
  CHECKIN_METRICS.every((metric) => {
    const value = scores[metric]
    return value != null && value >= 1 && value <= 5
  })
