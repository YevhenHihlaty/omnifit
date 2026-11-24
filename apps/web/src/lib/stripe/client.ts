import Stripe from "stripe"

let client: Stripe | null = null

/** Server-only Stripe client. Throws if STRIPE_SECRET_KEY missing when required. */
export const getStripe = (): Stripe => {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error("missing_stripe_secret")
  }
  // ponytail: SDK 17 lacks Accounts v2; controller props on accounts.create = Stripe-handles-pricing
  client = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  })
  return client
}

export const appUrl = (): string =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
