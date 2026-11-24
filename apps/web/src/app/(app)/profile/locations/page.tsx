import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { CoachProfileShell } from "@/features/coach-profile/CoachProfileShell"
import { CoachLocationsPanel } from "@/features/coach-profile/CoachLocationsPanel"
import { getCoachProfileHub } from "@/features/coach-profile/queries"
import { listCoachLocations } from "@/features/coach-profile/location-queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("coachProfile.locationsMeta") }
}

export default async function CoachLocationsPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const [hubResult, locationsResult] = await Promise.all([
    getCoachProfileHub(),
    listCoachLocations(),
  ])

  if (!hubResult.hub) redirect(ROUTES.dashboard)

  return (
    <CoachProfileShell
      displayName={hubResult.hub.displayName}
      avatarUrl={hubResult.hub.avatarUrl}
      specialties={hubResult.hub.specialties}
      activeTab="locations"
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
      <CoachLocationsPanel
        locations={locationsResult.locations}
        labels={{
          title: t("coachProfile.locationsTitle"),
          subtitle: t("coachProfile.locationsSubtitle"),
          addLocation: t("coachProfile.addLocation"),
          locationNameLabel: t("coachProfile.locationNameLabel"),
          locationAddressLabel: t("coachProfile.locationAddressLabel"),
          locationCityLabel: t("coachProfile.locationCityLabel"),
          locationTypeLabel: t("coachProfile.locationTypeLabel"),
          locationPrimary: t("coachProfile.locationPrimary"),
          locationRemove: t("coachProfile.locationRemove"),
          locationsEmpty: t("coachProfile.locationsEmpty"),
          locationSave: t("coachProfile.locationSave"),
          locationSaving: t("coachProfile.locationSaving"),
          locationCancel: t("coachProfile.locationCancel"),
          locationTypeGym: t("coachProfile.locationTypeGym"),
          locationTypeStudio: t("coachProfile.locationTypeStudio"),
          locationTypePark: t("coachProfile.locationTypePark"),
          locationTypeOutdoor: t("coachProfile.locationTypeOutdoor"),
          locationTypeOnline: t("coachProfile.locationTypeOnline"),
          locationTypeOther: t("coachProfile.locationTypeOther"),
          locationAddFailed: t("coachProfile.locationAddFailed"),
          locationRemoveFailed: t("coachProfile.locationRemoveFailed"),
        }}
      />
    </CoachProfileShell>
  )
}
