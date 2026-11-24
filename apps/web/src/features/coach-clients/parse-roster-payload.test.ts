import { describe, expect, it } from "vitest"
import { parseRosterPayload, parseRosterRow } from "./parse-roster-payload"

const baseRaw = {
  relationship_id: "rel-1",
  client_id: "c-1",
  display_name: "Alice Smith",
  avatar_url: null,
  email: "alice@example.com",
  status: "active",
  since: "2026-09-01T00:00:00Z",
  calories_today: 1840,
  workouts_today: 1,
  last_checkin_on: "2026-09-18",
  last_log_on: "2026-09-21",
  streak_days: 3,
  status_bucket: "on_track",
}

describe("parseRosterRow", () => {
  it("maps all fields correctly", () => {
    const row = parseRosterRow(baseRaw)
    expect(row.relationshipId).toBe("rel-1")
    expect(row.clientId).toBe("c-1")
    expect(row.displayName).toBe("Alice Smith")
    expect(row.email).toBe("alice@example.com")
    expect(row.status).toBe("active")
    expect(row.caloriesToday).toBe(1840)
    expect(row.workoutsToday).toBe(1)
    expect(row.statusBucket).toBe("on_track")
    expect(row.streakDays).toBe(3)
  })

  it("nulls activity fields for archived clients", () => {
    const archivedRaw = {
      ...baseRaw,
      status: "archived",
      calories_today: null,
      workouts_today: null,
      last_checkin_on: null,
      last_log_on: null,
      streak_days: null,
      status_bucket: null,
    }
    const row = parseRosterRow(archivedRaw)
    expect(row.status).toBe("archived")
    expect(row.caloriesToday).toBeNull()
    expect(row.streakDays).toBeNull()
    expect(row.statusBucket).toBeNull()
  })

  it("handles unknown status_bucket gracefully", () => {
    const row = parseRosterRow({ ...baseRaw, status_bucket: "unknown_value" })
    expect(row.statusBucket).toBeNull()
  })
})

describe("parseRosterPayload", () => {
  it("returns empty array for null", () => {
    expect(parseRosterPayload(null)).toEqual([])
  })

  it("returns empty array when success is false", () => {
    expect(parseRosterPayload({ success: false, error: "forbidden" })).toEqual([])
  })

  it("returns mapped rows", () => {
    const payload = { success: true, clients: [baseRaw, baseRaw] }
    expect(parseRosterPayload(payload)).toHaveLength(2)
  })

  it("returns empty array when clients is not an array", () => {
    expect(parseRosterPayload({ success: true, clients: null })).toEqual([])
  })
})
