import { describe, expect, it, vi, beforeEach } from "vitest"
import { buildPaymentRowAmounts } from "@/lib/stripe/checkout"
import { processStripeEvent } from "@/features/payments/webhook-handlers"
import { sendPaymentReceiptEmails } from "@/features/payments/receipt-emails"

describe("buildPaymentRowAmounts", () => {
  it("uses Free-tier service fee", () => {
    const amounts = buildPaymentRowAmounts(5000, "free")
    expect(amounts.serviceFee).toBe(150)
    expect(amounts.amountTotal).toBe(5150)
    expect(amounts.sessionPrice).toBe(5000)
  })

  it("uses Pro-tier service fee", () => {
    const amounts = buildPaymentRowAmounts(5000, "pro")
    expect(amounts.serviceFee).toBe(50)
    expect(amounts.amountTotal).toBe(5050)
  })
})

describe("processStripeEvent", () => {
  it("ignores unknown event types", async () => {
    const result = await processStripeEvent({
      id: "evt_1",
      object: "event",
      type: "ping",
      data: { object: {} },
    } as never)
    expect(result).toEqual({ handled: true, kind: "ignored:ping" })
  })
})

describe("sendPaymentReceiptEmails", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {})
  })

  it("logs receipt lines outside production", async () => {
    const result = await sendPaymentReceiptEmails({
      sessionId: "s1",
      coachId: "c1",
      clientId: "u1",
      sessionPriceCents: 5000,
      serviceFeeCents: 150,
      totalCents: 5150,
    })
    expect(result.logged).toBe(process.env.NODE_ENV !== "production")
  })
})
