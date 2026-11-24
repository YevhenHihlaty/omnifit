import { describe, expect, it } from "vitest"
import { buildCalendarWeekSnapshot, resolveSessionPaymentStatus } from "./week"
import type { CalendarSession } from "./types"

describe("resolveSessionPaymentStatus", () => {
  it("returns not_required for free first", () => {
    expect(
      resolveSessionPaymentStatus({
        freeFirstSession: true,
        paymentCollection: "in_app",
        priorSessionCount: 0,
      })
    ).toBe("not_required")
  })

  it("returns awaiting_payment for in_app after first", () => {
    expect(
      resolveSessionPaymentStatus({
        freeFirstSession: true,
        paymentCollection: "in_app",
        priorSessionCount: 1,
      })
    ).toBe("awaiting_payment")
  })

  it("returns direct for direct collection", () => {
    expect(
      resolveSessionPaymentStatus({
        freeFirstSession: false,
        paymentCollection: "direct",
        priorSessionCount: 0,
      })
    ).toBe("direct")
  })
})

describe("buildCalendarWeekSnapshot", () => {
  it("buckets sessions into Monday-start week", () => {
    const sessions: CalendarSession[] = [
      {
        id: "s1",
        title: "Strength",
        startsAt: "2026-09-22T10:00:00Z", // Tuesday
        endsAt: "2026-09-22T11:00:00Z",
        durationMinutes: 60,
        status: "upcoming",
        counterpartName: "Priya",
        sportType: "strength",
        clientId: "u1",
        paymentStatus: "direct",
      },
    ]
    const snap = buildCalendarWeekSnapshot(
      sessions,
      "en",
      new Date("2026-09-23T12:00:00")
    )
    expect(snap.days).toHaveLength(7)
    const tue = snap.days.find((d) => d.dateKey === "2026-09-22")
    expect(tue?.sessions).toHaveLength(1)
  })
})
