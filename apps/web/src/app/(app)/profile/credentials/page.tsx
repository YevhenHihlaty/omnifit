import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { CoachProfileShell } from "@/features/coach-profile/CoachProfileShell"
import { CoachCredentialsPanel } from "@/features/coach-profile/CoachCredentialsPanel"
import { getCoachProfileHub } from "@/features/coach-profile/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("coachProfile.credentialsMeta") }
}

export default async function CoachCredentialsPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const hubResult = await getCoachProfileHub()
  if (!hubResult.hub) redirect(ROUTES.dashboard)

  return (
    <CoachProfileShell
      displayName={hubResult.hub.displayName}
      avatarUrl={hubResult.hub.avatarUrl}
      specialties={hubResult.hub.specialties}
      activeTab="credentials"
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
      <CoachCredentialsPanel
        credentials={hubResult.hub.credentials}
        labels={{
          title: t("coachProfile.credentialsTitle"),
          subtitle: t("coachProfile.credentialsSubtitle"),
          yearsLabel: t("coachProfile.yearsLabel"),
          certificationsLabel: t("coachProfile.certificationsLabel"),
          educationLabel: t("coachProfile.educationLabel"),
          specialtiesLabel: t("coachProfile.specialtiesLabel"),
          save: t("coachProfile.save"),
          saving: t("coachProfile.saving"),
          saved: t("coachProfile.saved"),
          errors: {
            not_authenticated: t("coachProfile.errors.not_authenticated"),
            update_failed: t("coachProfile.errors.update_failed"),
          },
        }}
      />
    </CoachProfileShell>
  )
}
