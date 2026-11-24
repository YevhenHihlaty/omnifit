"use client"

import { Toggle } from "@omnifit/ui"
import { CoachOnboardingShell } from "./CoachOnboardingShell"
import type { CoachOnboardingStep } from "./steps"
import { completeCoachOnboarding } from "./complete-coach-onboarding"
import { readProfileDraft } from "./CoachOnboardingProfilePanel"
import { useTransition, useRef, useState } from "react"

type Props = {
  step: CoachOnboardingStep
  labels: {
    title: string
    specialties: string
    specialtiesHint: string
    specialtiesPlaceholder: string
    offersOnline: string
    skip: string
    continue: string
    stepOf: (current: number, total: number) => string
  }
}

export const CoachOnboardingPracticePanel = ({ step, labels }: Props) => {
  const [isPending, startTransition] = useTransition()
  const [offersOnline, setOffersOnline] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const finish = (includeForm: boolean) => {
    startTransition(async () => {
      const draft = readProfileDraft()
      const data = includeForm && formRef.current ? new FormData(formRef.current) : null
      const raw = data?.get("specialties") as string | null
      const specialties = raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : []
      await completeCoachOnboarding({
        displayName: draft.displayName,
        bio: draft.bio,
        specialties: includeForm ? specialties : undefined,
        snapshot: includeForm ? { offersOnline } : undefined,
      })
    })
  }

  return (
    <CoachOnboardingShell
      step={step}
      labels={labels}
      onContinue={() => finish(true)}
      onSkip={() => finish(false)}
      continueDisabled={isPending}
    >
      <h1 className="font-display text-2xl font-bold text-ink-900">{labels.title}</h1>
      <form ref={formRef} className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="specialties" className="block text-sm font-medium text-ink-700">
            {labels.specialties}
          </label>
          <input
            id="specialties"
            name="specialties"
            type="text"
            className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm text-ink-900 placeholder:text-ink-500 transition-[border-color,box-shadow] duration-fast focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
            placeholder={labels.specialtiesPlaceholder}
            aria-describedby="specialties-hint"
          />
          <p id="specialties-hint" className="mt-1 text-xs text-ink-500">
            {labels.specialtiesHint}
          </p>
        </div>

        <Toggle checked={offersOnline} onChange={setOffersOnline} label={labels.offersOnline} />
      </form>
    </CoachOnboardingShell>
  )
}
