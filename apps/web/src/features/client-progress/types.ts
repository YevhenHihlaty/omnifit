export type ProgressTab = "goals" | "progress" | "history" | "checkin"

export type HistoryFilter = "all" | "meal" | "workout" | "metrics" | "checkin"

export type WeightPoint = {
  loggedAt: string
  weightKg: number
}

export type LatestMeasurements = {
  weightKg: number | null
  waistCm: number | null
  chestCm: number | null
  armCm: number | null
  hipCm: number | null
  loggedAt: string
}

export type ProgressPhotoListItem = {
  id: string
  pose: string
  storagePath: string
  loggedAt: string
  url: string | null
}

export type HistoryFeedItem = {
  id: string
  kind: "workout" | "meal" | "metrics" | "checkin"
  titleKey: string
  weightKg?: number | null
  loggedAt: string
}

export type PastCheckinSummary = {
  weekStart: string
  sleep: number | null
  soreness: number | null
  stress: number | null
  energy: number | null
  motivation: number | null
}

export type ClientProgressPageData = {
  goal: string | null
  weightTrend: WeightPoint[]
  latestMeasurements: LatestMeasurements | null
  photos: ProgressPhotoListItem[]
  history: HistoryFeedItem[]
  thisWeekCheckin: PastCheckinSummary | null
  pastCheckins: PastCheckinSummary[]
  weekStart: string
}
