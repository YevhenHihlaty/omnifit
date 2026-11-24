import { afterEach, describe, expect, it } from "vitest"
import {
  coachMarketplaceEnabled,
  stripeSessionCheckoutEnabled,
  videoCallsEnabled,
} from "./index"

afterEach(() => {
  delete process.env.NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED
  delete process.env.NEXT_PUBLIC_VIDEO_CALLS_ENABLED
  delete process.env.NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED
})

describe("coachMarketplaceEnabled", () => {
  it("defaults to false when env is unset", () => {
    expect(coachMarketplaceEnabled()).toBe(false)
  })

  it("returns true when env is '1'", () => {
    process.env.NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED = "1"
    expect(coachMarketplaceEnabled()).toBe(true)
  })

  it("returns true when env is 'true'", () => {
    process.env.NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED = "true"
    expect(coachMarketplaceEnabled()).toBe(true)
  })

  it("returns false when env is '0'", () => {
    process.env.NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED = "0"
    expect(coachMarketplaceEnabled()).toBe(false)
  })
})

describe("videoCallsEnabled", () => {
  it("defaults to false", () => {
    expect(videoCallsEnabled()).toBe(false)
  })

  it("returns true when env is '1'", () => {
    process.env.NEXT_PUBLIC_VIDEO_CALLS_ENABLED = "1"
    expect(videoCallsEnabled()).toBe(true)
  })
})

describe("stripeSessionCheckoutEnabled", () => {
  it("defaults to false", () => {
    expect(stripeSessionCheckoutEnabled()).toBe(false)
  })

  it("returns true when env is '1'", () => {
    process.env.NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED = "1"
    expect(stripeSessionCheckoutEnabled()).toBe(true)
  })
})
