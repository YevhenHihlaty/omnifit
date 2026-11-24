import { ROUTES } from "@/lib/routes"

export const COACH_ONBOARDING_STEPS = ["profile", "practice"] as const
export type CoachOnboardingStep = (typeof COACH_ONBOARDING_STEPS)[number]

const STEP_PATHS: Record<CoachOnboardingStep, string> = {
  profile: ROUTES.onboardingProfile,
  practice: ROUTES.onboardingPractice,
}

export const isOnboardingStep = (value: unknown): value is CoachOnboardingStep =>
  typeof value === "string" && (COACH_ONBOARDING_STEPS as readonly string[]).includes(value)

export const nextStepPath = (current: CoachOnboardingStep): string => {
  const idx = COACH_ONBOARDING_STEPS.indexOf(current)
  const next = COACH_ONBOARDING_STEPS[idx + 1]
  return next ? STEP_PATHS[next] : ROUTES.dashboard
}
