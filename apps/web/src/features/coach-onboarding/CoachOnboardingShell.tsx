"use client"

import { Button } from "@omnifit/ui"
import { COACH_ONBOARDING_STEPS } from "./steps"
import type { CoachOnboardingStep } from "./steps"
import type { ReactNode } from "react"

type CoachOnboardingShellProps = {
  step: CoachOnboardingStep
  children: ReactNode
  labels: {
    skip: string
    continue: string
    stepOf: (current: number, total: number) => string
  }
  onContinue?: () => void
  onSkip?: () => void
  continueDisabled?: boolean
}

export const CoachOnboardingShell = ({
  step,
  children,
  labels,
  onContinue,
  onSkip,
  continueDisabled,
}: CoachOnboardingShellProps) => {
  const stepIndex = COACH_ONBOARDING_STEPS.indexOf(step)
  const stepNumber = stepIndex + 1
  const total = COACH_ONBOARDING_STEPS.length

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-lg">
        <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-ink-500">
          {labels.stepOf(stepNumber, total)}
        </p>

        {children}

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onSkip}
            disabled={continueDisabled || !onSkip}
            className="min-h-11 text-sm font-medium text-ink-500 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {labels.skip}
          </button>

          <Button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled || !onContinue}
            className="bg-ink-900 hover:bg-ink-700"
          >
            {labels.continue}
          </Button>
        </div>

        <div
          className="mt-8 flex justify-center gap-2"
          role="progressbar"
          aria-valuenow={stepNumber}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={labels.stepOf(stepNumber, total)}
        >
          {COACH_ONBOARDING_STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= stepIndex ? "bg-pine" : "bg-stone-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
