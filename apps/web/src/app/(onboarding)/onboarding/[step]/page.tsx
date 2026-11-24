import { notFound } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { isOnboardingStep } from "@/features/coach-onboarding/steps"
import { CoachOnboardingProfilePanel } from "@/features/coach-onboarding/CoachOnboardingProfilePanel"
import { CoachOnboardingPracticePanel } from "@/features/coach-onboarding/CoachOnboardingPracticePanel"

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  const { t } = await getServerTranslator()

  if (!isOnboardingStep(step)) notFound()

  const shellLabels = {
    skip: t("onboarding.skip"),
    continue: t("onboarding.continue"),
    stepOf: (current: number, total: number) =>
      t("onboarding.stepOf").replace("{current}", String(current)).replace("{total}", String(total)),
  }

  if (step === "profile") {
    return (
      <CoachOnboardingProfilePanel
        step={step}
        labels={{
          ...shellLabels,
          title: t("onboarding.profile.title"),
          displayName: t("auth.displayName"),
          bio: t("onboarding.profile.bio"),
        }}
      />
    )
  }

  return (
    <CoachOnboardingPracticePanel
      step={step}
      labels={{
        ...shellLabels,
        title: t("onboarding.practice.title"),
        specialties: t("onboarding.practice.specialties"),
        specialtiesHint: t("onboarding.practice.specialtiesHint"),
        specialtiesPlaceholder: t("onboarding.practice.specialtiesPlaceholder"),
        offersOnline: t("onboarding.practice.offersOnline"),
      }}
    />
  )
}
