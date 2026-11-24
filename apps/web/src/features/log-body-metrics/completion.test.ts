import { describe, expect, it } from "vitest"
import { isBodyMetricsLogComplete } from "./completion"
import type { LogBodyMetricsDraft } from "./types"

const emptyDraft = (): LogBodyMetricsDraft => ({
  measurements: {
    weightKg: "",
    chestCm: "",
    waistCm: "",
    hipCm: "",
    armCm: "",
  },
  photos: {
    front: false,
    side: false,
    back: false,
  },
  notes: "",
})

describe("isBodyMetricsLogComplete", () => {
  it("returns false when weight is missing", () => {
    const draft = emptyDraft()
    draft.photos = { front: true, side: true, back: true }
    expect(isBodyMetricsLogComplete(draft)).toBe(false)
  })

  it("returns false when any progress photo is missing", () => {
    const draft = emptyDraft()
    draft.measurements.weightKg = "75.0"
    draft.photos = { front: true, side: true, back: false }
    expect(isBodyMetricsLogComplete(draft)).toBe(false)
  })

  it("returns true when weight and all three photos are present", () => {
    const draft = emptyDraft()
    draft.measurements.weightKg = "75.0"
    draft.photos = { front: true, side: true, back: true }
    expect(isBodyMetricsLogComplete(draft)).toBe(true)
  })

  it("does not require optional circumference fields", () => {
    const draft = emptyDraft()
    draft.measurements.weightKg = "82"
    draft.photos = { front: true, side: true, back: true }
    expect(isBodyMetricsLogComplete(draft)).toBe(true)
  })
})
