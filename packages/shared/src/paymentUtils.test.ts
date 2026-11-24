import { describe, expect, it } from "vitest"
import {
  ACQUISITION_FEE_CENTS,
  PLATFORM_SERVICE_FEE_FREE_CENTS,
  PLATFORM_SERVICE_FEE_PRO_CENTS,
  clientTotal,
  formatUsdFromCents,
  platformServiceFeeCents,
} from "./paymentUtils"

describe("paymentUtils", () => {
  it("uses tier-dependent service fees", () => {
    expect(PLATFORM_SERVICE_FEE_FREE_CENTS).toBe(150)
    expect(PLATFORM_SERVICE_FEE_PRO_CENTS).toBe(50)
    expect(ACQUISITION_FEE_CENTS).toBe(1500)
    expect(platformServiceFeeCents("free")).toBe(150)
    expect(platformServiceFeeCents("pro")).toBe(50)
  })

  it("adds fee to client total", () => {
    expect(clientTotal(5000, "free")).toBe(5150)
    expect(clientTotal(5000, "pro")).toBe(5050)
  })

  it("formats cents", () => {
    expect(formatUsdFromCents(150)).toBe("$1.50")
    expect(formatUsdFromCents(1500)).toBe("$15")
  })
})
