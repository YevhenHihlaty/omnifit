"use client"

import { Input } from "@omnifit/ui"
import { CoachOnboardingShell } from "./CoachOnboardingShell"
import type { CoachOnboardingStep } from "./steps"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { useRef } from "react"

const DRAFT_KEY = "omnifit:onboarding-draft"

type Props = {
  step: CoachOnboardingStep
  labels: {
    title: string
    displayName: string
    bio: string
    skip: string
    continue: string
    stepOf: (current: number, total: number) => string
  }
}

/** Persist profile fields for the practice step (tab close loses draft — ponytail). */
const saveProfileDraft = (displayName?: string, bio?: string) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ displayName, bio }))
  } catch {
    /* ignore quota / private mode */
  }
}

export const readProfileDraft = (): { displayName?: string; bio?: string } => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as { displayName?: string; bio?: string }) : {}
  } catch {
    return {}
  }
}

export const CoachOnboardingProfilePanel = ({ step, labels }: Props) => {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const readForm = () => {
    const data = new FormData(formRef.current!)
    return {
      displayName: (data.get("displayName") as string) || undefined,
      bio: (data.get("bio") as string) || undefined,
    }
  }

  const handleContinue = () => {
    const draft = readForm()
    saveProfileDraft(draft.displayName, draft.bio)
    router.push(ROUTES.onboardingPractice)
  }

  const handleSkip = () => {
    router.push(ROUTES.onboardingPractice)
  }

  return (
    <CoachOnboardingShell
      step={step}
      labels={labels}
      onContinue={handleContinue}
      onSkip={handleSkip}
    >
      <h1 className="font-display text-2xl font-bold text-ink-900">{labels.title}</h1>
      <form ref={formRef} className="mt-6 flex flex-col gap-5">
        <Input label={labels.displayName} name="displayName" type="text" maxLength={80} />
        <div>
          <label htmlFor="onboarding-bio" className="block text-sm font-medium text-ink-700">
            {labels.bio}
          </label>
          <textarea
            id="onboarding-bio"
            name="bio"
            rows={4}
            maxLength={400}
            className="mt-1.5 w-full min-h-24 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 transition-[border-color,box-shadow] duration-fast focus:border-pine focus:outline-none focus:shadow-[var(--of-focus-ring)]"
          />
        </div>
      </form>
    </CoachOnboardingShell>
  )
}
