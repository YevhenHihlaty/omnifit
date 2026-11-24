export const PLATFORM_SERVICE_FEE_FREE_CENTS = 150 // $1.50 Free tier
export const PLATFORM_SERVICE_FEE_PRO_CENTS = 50 // $0.50 Pro tier
/** @deprecated use tier-specific fees — kept for older call sites */
export const PLATFORM_SERVICE_FEE_CENTS = PLATFORM_SERVICE_FEE_FREE_CENTS

export const ACQUISITION_FEE_CENTS = 1500 // $15.00 coach acquisition invoice

export const platformServiceFeeCents = (tier: "free" | "pro" | string): number =>
  tier === "pro" ? PLATFORM_SERVICE_FEE_PRO_CENTS : PLATFORM_SERVICE_FEE_FREE_CENTS

export const formatUsdFromCents = (cents: number): string =>
  `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`

/** Amount the client pays: session price + platform service fee */
export function clientTotal(
  sessionPriceCents: number,
  tier: "free" | "pro" | string = "free"
): number {
  return sessionPriceCents + platformServiceFeeCents(tier)
}

/** Net payout to coach after Stripe fee (approximate 2.9% + $0.30 on the total) */
export function coachNetPayout(
  sessionPriceCents: number,
  tier: "free" | "pro" | string = "free"
): {
  stripeFee: number
  netPayout: number
  serviceFee: number
} {
  const serviceFee = platformServiceFeeCents(tier)
  const total = sessionPriceCents + serviceFee
  const stripeFee = Math.round(total * 0.029 + 30)
  const netPayout = sessionPriceCents - stripeFee
  return { stripeFee, netPayout, serviceFee }
}
