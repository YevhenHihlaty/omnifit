import { platformServiceFeeCents, coachNetPayout } from "@omnifit/shared"
import { getStripe, appUrl } from "./client"

export type CheckoutCreateInput = {
  sessionId: string
  coachStripeAccountId: string
  sessionPriceCents: number
  coachTier: string
  clientEmail: string
  clientUserId: string
  coachUserId: string
  sessionTitle: string
}

export const createSessionCheckout = async (
  input: CheckoutCreateInput
): Promise<{ checkoutUrl: string; checkoutSessionId: string }> => {
  const stripe = getStripe()
  const serviceFee = platformServiceFeeCents(input.coachTier)
  const total = input.sessionPriceCents + serviceFee
  if (total <= 0) {
    throw new Error("invalid_amount")
  }

  const metadata = {
    omnifit_session_id: input.sessionId,
    omnifit_coach_id: input.coachUserId,
    omnifit_client_id: input.clientUserId,
    session_price_cents: String(input.sessionPriceCents),
    service_fee_cents: String(serviceFee),
  }

  const base = appUrl()
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.clientEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: input.sessionPriceCents,
            product_data: {
              name: input.sessionTitle || "Coaching session",
              description: "Session with your coach",
            },
          },
        },
        ...(serviceFee > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: serviceFee,
                  product_data: {
                    name: "OmniFit service fee",
                    description:
                      input.coachTier === "pro"
                        ? "Pro platform fee"
                        : "Free-tier platform fee",
                  },
                },
              },
            ]
          : []),
      ],
      payment_intent_data: {
        ...(serviceFee > 0 ? { application_fee_amount: serviceFee } : {}),
        metadata,
      },
      metadata,
      success_url: `${base}/receipt/${encodeURIComponent(input.sessionId)}?cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/calendar/checkout/${encodeURIComponent(input.sessionId)}?canceled=1`,
    },
    {
      stripeAccount: input.coachStripeAccountId,
    }
  )

  if (!checkout.url) throw new Error("checkout_url_missing")
  return { checkoutUrl: checkout.url, checkoutSessionId: checkout.id }
}

export const buildPaymentRowAmounts = (
  sessionPriceCents: number,
  coachTier: string
) => {
  const serviceFee = platformServiceFeeCents(coachTier)
  const { stripeFee, netPayout } = coachNetPayout(sessionPriceCents, coachTier)
  return {
    amountTotal: sessionPriceCents + serviceFee,
    sessionPrice: sessionPriceCents,
    serviceFee,
    stripeFee,
    netPayout,
  }
}
