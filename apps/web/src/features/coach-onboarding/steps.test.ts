import { describe, it, expect } from "vitest"
import { isOnboardingStep, nextStepPath, COACH_ONBOARDING_STEPS } from "./steps"

describe("isOnboardingStep", () => {
  it("accepts valid steps", () => {
    expect(isOnboardingStep("profile")).toBe(true)
    expect(isOnboardingStep("practice")).toBe(true)
  })
  it("rejects invalid steps", () => {
    expect(isOnboardingStep("gym")).toBe(false)
    expect(isOnboardingStep(null)).toBe(false)
    expect(isOnboardingStep(undefined)).toBe(false)
    expect(isOnboardingStep("")).toBe(false)
  })
})

describe("nextStepPath", () => {
  it("returns practice path after profile", () => {
    expect(nextStepPath("profile")).toBe("/onboarding/practice")
  })
  it("returns dashboard after last step", () => {
    const last = COACH_ONBOARDING_STEPS[COACH_ONBOARDING_STEPS.length - 1]
    expect(nextStepPath(last)).toBe("/dashboard")
  })
})
