import { describe, expect, it } from "vitest"
import { buildActivitySubtitle, bucketLabelKey, daysSince } from "./client-status"

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    key
  )
}

const TODAY = "2026-09-21"

describe("bucketLabelKey", () => {
  it("returns on_track key", () => {
    expect(bucketLabelKey("on_track")).toBe("coachClients.bucket.onTrack")
  })
  it("returns at_risk key", () => {
    expect(bucketLabelKey("at_risk")).toBe("coachClients.bucket.atRisk")
  })
  it("returns new key", () => {
    expect(bucketLabelKey("new")).toBe("coachClients.bucket.new")
  })
})

describe("buildActivitySubtitle", () => {
  it("returns archived label when all null", () => {
    const result = buildActivitySubtitle({
      caloriesToday: null,
      workoutsToday: null,
      lastCheckinOn: null,
      lastLogOn: null,
      todayIso: TODAY,
      t,
    })
    expect(result).toBe("coachClients.activity.archived")
  })

  it("shows noCheckinDays when last checkin ≥6 days ago", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 1840,
      workoutsToday: 1,
      lastCheckinOn: "2026-09-14", // 7 days ago
      lastLogOn: TODAY,
      todayIso: TODAY,
      t,
    })
    // t is a pass-through stub: key is returned, vars are substituted into the key
    // "coachClients.activity.noCheckinDays" doesn't contain "{days}" so check key presence
    expect(result).toContain("coachClients.activity.noCheckinDays")
  })

  it("shows cal + workout when active today with recent check-in", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 1840,
      workoutsToday: 1,
      lastCheckinOn: "2026-09-18", // 3 days ago, ok
      lastLogOn: TODAY,
      todayIso: TODAY,
      t,
    })
    expect(result).toContain("coachClients.activity.calToday")
    expect(result).toContain("coachClients.activity.workoutToday")
  })

  it("shows noActivityToday when 0 cals and 0 workouts", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 0,
      workoutsToday: 0,
      lastCheckinOn: "2026-09-18",
      lastLogOn: TODAY,
      todayIso: TODAY,
      t,
    })
    expect(result).toBe("coachClients.activity.noActivityToday")
  })

  it("shows joinedDaysAgo for new bucket with since date", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 0,
      workoutsToday: 0,
      lastCheckinOn: null,
      lastLogOn: "2026-09-20",
      todayIso: TODAY,
      statusBucket: "new",
      since: "2026-09-18", // 3 days ago
      t,
    })
    expect(result).toContain("coachClients.activity.joinedDaysAgo")
  })

  it("does not show joinedDaysAgo when bucket is not new", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 500,
      workoutsToday: 0,
      lastCheckinOn: "2026-09-18",
      lastLogOn: TODAY,
      todayIso: TODAY,
      statusBucket: "on_track",
      since: "2026-09-18",
      t,
    })
    expect(result).not.toContain("coachClients.activity.joinedDaysAgo")
  })

  it("appends rest day when calories but no workouts", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 500,
      workoutsToday: 0,
      lastCheckinOn: "2026-09-18",
      lastLogOn: TODAY,
      todayIso: TODAY,
      t,
    })
    expect(result).not.toContain("coachClients.activity.workoutToday")
    expect(result).toContain("coachClients.activity.calToday")
    expect(result).toContain("coachClients.activity.restDay")
  })

  it("pluralizes workouts when count > 1", () => {
    const result = buildActivitySubtitle({
      caloriesToday: 1840,
      workoutsToday: 2,
      lastCheckinOn: "2026-09-18",
      lastLogOn: TODAY,
      todayIso: TODAY,
      t,
    })
    expect(result).toContain("coachClients.activity.workoutTodayOther")
  })
})

describe("daysSince", () => {
  it("returns null for null input", () => {
    expect(daysSince(null, TODAY)).toBeNull()
  })
  it("returns 0 for same day", () => {
    expect(daysSince(TODAY, TODAY)).toBe(0)
  })
  it("returns correct count", () => {
    expect(daysSince("2026-09-14", TODAY)).toBe(7)
  })
})
