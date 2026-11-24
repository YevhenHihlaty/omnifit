import { PROGRESS_PHOTO_POSES } from "./types"
import type { LogBodyMetricsDraft } from "./types"

const hasNumericValue = (value: string) => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed > 0
}

export const isBodyMetricsLogComplete = (
  draft: LogBodyMetricsDraft
): boolean => {
  const hasWeight = hasNumericValue(draft.measurements.weightKg)
  const hasAllPhotos = PROGRESS_PHOTO_POSES.every((pose) => draft.photos[pose])
  return hasWeight && hasAllPhotos
}
