export const PROGRESS_PHOTO_POSES = ["front", "side", "back"] as const
export type ProgressPhotoPose = (typeof PROGRESS_PHOTO_POSES)[number]

export type BodyMeasurementDraft = {
  weightKg: string
  chestCm: string
  waistCm: string
  hipCm: string
  armCm: string
}

export type ProgressPhotoSlots = Record<ProgressPhotoPose, boolean>

export type LogBodyMetricsDraft = {
  measurements: BodyMeasurementDraft
  photos: ProgressPhotoSlots
  notes: string
}

export const emptyBodyMeasurements = (): BodyMeasurementDraft => ({
  weightKg: "",
  chestCm: "",
  waistCm: "",
  hipCm: "",
  armCm: "",
})

export const emptyPhotoSlots = (): ProgressPhotoSlots => ({
  front: false,
  side: false,
  back: false,
})

export type RecentBodyMetric = {
  id: string
  loggedAt: string
  weightKg: number | null
}

export type LogBodyMetricsPageData = {
  recent: RecentBodyMetric[]
}
