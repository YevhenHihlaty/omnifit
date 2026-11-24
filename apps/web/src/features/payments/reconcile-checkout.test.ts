import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(),
}))
vi.mock("@/lib/stripe/client", () => ({
  getStripe: vi.fn(),
}))
vi.mock("@/features/payments/webhook-handlers", () => ({
  handleCheckoutSessionCompleted: vi.fn(async () => ({
    handled: true,
    kind: "checkout.session.completed",
  })),
}))

import { createSupabaseServiceClient } from "@/lib/supabase/service"
import { getStripe } from "@/lib/stripe/client"
import { handleCheckoutSessionCompleted } from "@/features/payments/webhook-handlers"
import { reconcilePaidCheckout } from "@/features/payments/reconcile-checkout"

describe("reconcilePaidCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("short-circuits when already paid", async () => {
    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "s1",
                payment_status: "paid",
                stripe_checkout_session_id: "cs_1",
                coach_id: "c1",
              },
            }),
          }),
        }),
      }),
    } as never)

    await expect(
      reconcilePaidCheckout({ omnifitSessionId: "s1" })
    ).resolves.toEqual({ paid: true })
    expect(getStripe).not.toHaveBeenCalled()
  })

  it("reconciles complete checkout from Stripe", async () => {
    const maybeSingleSession = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "s1",
          payment_status: "awaiting_payment",
          stripe_checkout_session_id: "cs_1",
          coach_id: "c1",
        },
      })
    const maybeSingleCoach = vi.fn().mockResolvedValue({
      data: { stripe_account_id: "acct_1" },
    })

    vi.mocked(createSupabaseServiceClient).mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle:
              table === "sessions" ? maybeSingleSession : maybeSingleCoach,
          }),
        }),
      }),
    } as never)

    const checkout = {
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      metadata: {},
    }
    vi.mocked(getStripe).mockReturnValue({
      checkout: {
        sessions: {
          retrieve: vi.fn(async () => checkout),
        },
      },
    } as never)

    await expect(
      reconcilePaidCheckout({
        omnifitSessionId: "s1",
        stripeCheckoutSessionId: "cs_1",
      })
    ).resolves.toEqual({ paid: true })
    expect(handleCheckoutSessionCompleted).toHaveBeenCalledWith(checkout)
  })
})
