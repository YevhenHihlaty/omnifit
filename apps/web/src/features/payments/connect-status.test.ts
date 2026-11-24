import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/stripe/connect", () => ({
  isConnectChargesReady: vi.fn(),
}))

import { isConnectChargesReady } from "@/lib/stripe/connect"
import { getStripeConnectStatus } from "@/features/payments/checkout-queries"

describe("getStripeConnectStatus", () => {
  beforeEach(() => {
    vi.mocked(isConnectChargesReady).mockReset()
  })

  it("returns none without account id", async () => {
    await expect(getStripeConnectStatus(null)).resolves.toBe("none")
    expect(isConnectChargesReady).not.toHaveBeenCalled()
  })

  it("returns ready when charges enabled", async () => {
    vi.mocked(isConnectChargesReady).mockResolvedValue(true)
    await expect(getStripeConnectStatus("acct_1")).resolves.toBe("ready")
  })

  it("returns pending when charges not enabled", async () => {
    vi.mocked(isConnectChargesReady).mockResolvedValue(false)
    await expect(getStripeConnectStatus("acct_1")).resolves.toBe("pending")
  })

  it("returns pending when Stripe lookup fails", async () => {
    vi.mocked(isConnectChargesReady).mockRejectedValue(new Error("network"))
    await expect(getStripeConnectStatus("acct_1")).resolves.toBe("pending")
  })
})
