import { describe, expect, it } from "vitest"
import { daysBetween, formatRelativeDay, formatActivityAt } from "./format-relative"

describe("daysBetween", () => {
  it("returns 0 for same day", () => {
    expect(daysBetween("2026-09-21", "2026-09-21")).toBe(0)
  })
  it("returns positive when to > from", () => {
    expect(daysBetween("2026-09-18", "2026-09-21")).toBe(3)
  })
})

describe("formatRelativeDay", () => {
  const labels = {
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: (n: number) => `${n} days ago`,
  }

  it("returns em dash for null", () => {
    expect(formatRelativeDay(null, "2026-09-21", labels)).toBe("—")
  })

  it("returns Today for same day", () => {
    expect(formatRelativeDay("2026-09-21", "2026-09-21", labels)).toBe("Today")
  })

  it("returns Yesterday for 1 day ago", () => {
    expect(formatRelativeDay("2026-09-20", "2026-09-21", labels)).toBe("Yesterday")
  })

  it("returns N days ago for recent dates", () => {
    expect(formatRelativeDay("2026-09-15", "2026-09-21", labels)).toBe("6 days ago")
  })
})

describe("formatActivityAt", () => {
  it("formats time when same calendar day", () => {
    const now = new Date("2026-09-21T15:00:00Z")
    const result = formatActivityAt("2026-09-21T08:12:00Z", now)
    expect(result).toMatch(/\d/)
    expect(result.toLowerCase()).not.toContain("yesterday")
  })

  it("returns Yesterday for previous day", () => {
    const now = new Date("2026-09-21T15:00:00Z")
    expect(formatActivityAt("2026-09-20T18:00:00Z", now)).toBe("Yesterday")
  })
})
