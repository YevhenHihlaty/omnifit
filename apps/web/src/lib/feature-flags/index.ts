/**
 * OmniFit MVP feature flags — read from NEXT_PUBLIC_* env vars.
 * Default OFF for all Sprint 1 gated features.
 */

const flag = (envKey: string): boolean =>
  process.env[envKey] === "1" || process.env[envKey] === "true"

/** Phase 2 — marketplace / Find Coach. Default: off. */
export const coachMarketplaceEnabled = (): boolean =>
  flag("NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED")

/** Phase 2 — live video calls. Default: off. */
export const videoCallsEnabled = (): boolean =>
  flag("NEXT_PUBLIC_VIDEO_CALLS_ENABLED")

/** Phase 2 — Stripe session checkout. Default: off. */
export const stripeSessionCheckoutEnabled = (): boolean =>
  flag("NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED")
