import { describe, expect, it } from "vitest"
import {
  formatSessionTimeRange,
  localDateKey,
  paymentPillVariant,
  resolveSessionTitle,
} from "./calendar-format"

describe("localDateKey", () => {
  it("formats local Y-M-D", () => {
    expect(localDateKey(new Date(2026, 8, 21))).toBe("2026-09-21")
  })
})

describe("formatSessionTimeRange", () => {
  it("joins start and end", () => {
    const label = formatSessionTimeRange(
      "2026-09-22T15:00:00Z",
      "2026-09-22T15:45:00Z",
      "en"
    )
    expect(label).toContain("–")
  })
})

describe("resolveSessionTitle", () => {
  it("prefers sport label over raw title", () => {
    expect(
      resolveSessionTitle("weight_lifting session", "weight_lifting", {
        weight_lifting: "Weight lifting",
      })
    ).toBe("Weight lifting")
  })
})

describe("paymentPillVariant", () => {
  it("maps statuses", () => {
    expect(paymentPillVariant("awaiting_payment")).toBe("danger")
    expect(paymentPillVariant("not_required")).toBe("active")
    expect(paymentPillVariant("direct")).toBe("inactive")
  })
})
