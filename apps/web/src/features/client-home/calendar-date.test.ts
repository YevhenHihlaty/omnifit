import { describe, expect, it } from "vitest"
import { toCalendarDateIso } from "./calendar-date"

describe("toCalendarDateIso", () => {
  it("formats UTC midnight as that calendar day in UTC", () => {
    expect(toCalendarDateIso(new Date("2026-09-21T00:30:00.000Z"), "UTC")).toBe(
      "2026-09-21"
    )
  })

  it("shifts late UTC evening into next local day for US zones", () => {
    // 2026-09-21 03:00 UTC = Sep 20 evening in America/Los_Angeles
    expect(
      toCalendarDateIso(new Date("2026-09-21T03:00:00.000Z"), "America/Los_Angeles")
    ).toBe("2026-09-20")
  })

  it("falls back to UTC on invalid timezone", () => {
    expect(toCalendarDateIso(new Date("2026-09-21T12:00:00.000Z"), "Not/AZone")).toBe(
      "2026-09-21"
    )
  })
})
