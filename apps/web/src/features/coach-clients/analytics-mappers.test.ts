import { describe, expect, it } from "vitest"
import {
  buildTrainingVolumeWeeks,
  computeAdherence,
  groupProgressPhotos,
  pickLatestTwoCheckins,
} from "./analytics-mappers"

describe("computeAdherence", () => {
  it("caps at 100%", () => {
    expect(computeAdherence(12, 10).adherencePercent).toBe(100)
  })

  it("rounds percent", () => {
    expect(computeAdherence(3, 4).adherencePercent).toBe(75)
  })
})

describe("buildTrainingVolumeWeeks", () => {
  it("buckets sets into 8 Sunday-start weeks", () => {
    // Fixed "now" = Wednesday 2026-09-23 → week starts 2026-08-02 … 2026-09-20
    const now = new Date("2026-09-23T12:00:00Z")
    const weeks = buildTrainingVolumeWeeks(
      [
        { logged_at: "2026-09-21T10:00:00Z", set_count: 5 },
        { logged_at: "2026-09-22T10:00:00Z", set_count: 3 },
        { logged_at: "2026-08-05T10:00:00Z", set_count: 10 },
      ],
      8,
      now
    )
    expect(weeks).toHaveLength(8)
    expect(weeks[0]?.weekStart).toBe("2026-08-02")
    expect(weeks[0]?.sets).toBe(10)
    expect(weeks[weeks.length - 1]?.weekStart).toBe("2026-09-20")
    expect(weeks[weeks.length - 1]?.sets).toBe(8)
  })
})

describe("groupProgressPhotos", () => {
  it("groups poses by body_metrics_id", () => {
    const groups = groupProgressPhotos(
      [
        {
          body_metrics_id: "bm1",
          pose: "front",
          storage_path: "a/front.jpg",
          created_at: "2026-09-01T00:00:00Z",
          body_metrics: { logged_at: "2026-09-01T00:00:00Z" },
        },
        {
          body_metrics_id: "bm1",
          pose: "side",
          storage_path: "a/side.jpg",
          created_at: "2026-09-01T00:00:00Z",
          body_metrics: { logged_at: "2026-09-01T00:00:00Z" },
        },
      ],
      { "a/front.jpg": "https://x/front", "a/side.jpg": "https://x/side" }
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.photos).toHaveLength(2)
    expect(groups[0]?.photos[0]?.url).toBe("https://x/front")
  })
})

describe("pickLatestTwoCheckins", () => {
  it("returns first two weeks", () => {
    const [a, b] = pickLatestTwoCheckins([
      {
        weekStart: "2026-09-20",
        sleep: 4,
        soreness: 2,
        stress: 2,
        energy: 4,
        motivation: 5,
      },
      {
        weekStart: "2026-09-13",
        sleep: 3,
        soreness: 3,
        stress: 3,
        energy: 3,
        motivation: 3,
      },
    ])
    expect(a?.weekStart).toBe("2026-09-20")
    expect(b?.weekStart).toBe("2026-09-13")
  })
})
