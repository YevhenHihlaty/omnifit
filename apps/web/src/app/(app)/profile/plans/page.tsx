import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { CoachProfileShell } from "@/features/coach-profile/CoachProfileShell"
import { CoachPlansPanel } from "@/features/coach-profile/CoachPlansPanel"
import {
  getCoachProfileHub,
  listCoachServicePlans,
} from "@/features/coach-profile/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("coachProfile.plansMeta") }
}

export default async function CoachPlansPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const [hubResult, plansResult] = await Promise.all([
    getCoachProfileHub(),
    listCoachServicePlans(),
  ])

  if (!hubResult.hub) redirect(ROUTES.dashboard)

  return (
    <CoachProfileShell
      displayName={hubResult.hub.displayName}
      avatarUrl={hubResult.hub.avatarUrl}
      specialties={hubResult.hub.specialties}
      activeTab="plans"
      labels={{
        plans: t("coachProfile.tabPlans"),
        locations: t("coachProfile.tabLocations"),
        credentials: t("coachProfile.tabCredentials"),
        settings: t("coachProfile.tabSettings"),
        tabsLabel: t("coachProfile.tabsLabel"),
        editProfile: t("coachProfile.editProfile"),
        viewPublicProfile: t("coachProfile.viewPublicProfile"),
      }}
    >
      <CoachPlansPanel
        plans={plansResult.plans}
        loadFailed={plansResult.loadFailed || hubResult.loadFailed}
        loadFailedLabel={t("coachProfile.loadFailed")}
        labels={{
          title: t("coachProfile.plansTitle"),
          subtitle: t("coachProfile.plansSubtitle"),
          newPlan: t("coachProfile.newPlan"),
          emptyTitle: t("coachProfile.plansEmptyTitle"),
          emptyBody: t("coachProfile.plansEmptyBody"),
          titleLabel: t("coachProfile.planTitleLabel"),
          durationLabel: t("coachProfile.planDurationLabel"),
          priceLabel: t("coachProfile.planPriceLabel"),
          descriptionLabel: t("coachProfile.planDescriptionLabel"),
          published: t("coachProfile.published"),
          draft: t("coachProfile.draft"),
          save: t("coachProfile.save"),
          saving: t("coachProfile.saving"),
          cancel: t("coachProfile.cancel"),
          edit: t("coachProfile.edit"),
          delete: t("coachProfile.delete"),
          minutes: t("coachProfile.minutes"),
          errors: {
            title_required: t("coachProfile.errors.title_required"),
            invalid_duration: t("coachProfile.errors.invalid_duration"),
            invalid_price: t("coachProfile.errors.invalid_price"),
            not_authenticated: t("coachProfile.errors.not_authenticated"),
            create_failed: t("coachProfile.errors.create_failed"),
            update_failed: t("coachProfile.errors.update_failed"),
            delete_failed: t("coachProfile.errors.delete_failed"),
            not_found: t("coachProfile.errors.not_found"),
          },
        }}
      />
    </CoachProfileShell>
  )
}
