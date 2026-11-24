import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    accounts: {
      create: vi.fn(async () => ({ id: "acct_new" })),
      retrieve: vi.fn(async () => ({ charges_enabled: true })),
    },
    accountLinks: {
      create: vi.fn(async () => ({ url: "https://connect.stripe.test/onboard" })),
    },
  }),
  appUrl: () => "http://localhost:3000",
}))

import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  isConnectChargesReady,
} from "@/lib/stripe/connect"

describe("stripe connect helpers", () => {
  it("reuses existing account id", async () => {
    await expect(
      ensureConnectAccount({
        existingAccountId: "acct_existing",
        email: "c@example.com",
        displayName: "Coach",
      })
    ).resolves.toEqual({ accountId: "acct_existing" })
  })

  it("creates account when missing", async () => {
    await expect(
      ensureConnectAccount({
        existingAccountId: null,
        email: "c@example.com",
        displayName: "Coach",
      })
    ).resolves.toEqual({ accountId: "acct_new" })
  })

  it("builds onboarding link", async () => {
    await expect(createConnectOnboardingLink("acct_1")).resolves.toEqual({
      url: "https://connect.stripe.test/onboard",
    })
  })

  it("reports charges ready", async () => {
    await expect(isConnectChargesReady("acct_1")).resolves.toBe(true)
  })
})
