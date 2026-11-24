import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { loadCoachWorkoutLibrary } from "@/features/workout-library/queries"
import { WorkoutLibraryView } from "@/features/workout-library/WorkoutLibraryView"
import { SPORT_TYPES } from "@/features/log-training/types"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("coachLibrary.title") }
}

export default async function CoachProgramsPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { templates, loadFailed } = await loadCoachWorkoutLibrary(user.id)
  const sportLabels = Object.fromEntries(
    SPORT_TYPES.map((s) => [s, t(`logTraining.sports.${s}`)])
  )

  return (
    <WorkoutLibraryView
      templates={templates}
      loadFailed={loadFailed}
      sportLabels={sportLabels}
      labels={{
        title: t("coachLibrary.title"),
        subtitle: t("coachLibrary.subtitle"),
        empty: t("coachLibrary.empty"),
        emptyHint: t("coachLibrary.emptyHint"),
        exercises: t("coachLibrary.exercises"),
        deleteLabel: t("coachLibrary.delete"),
        deleting: t("coachLibrary.deleting"),
        loadFailed: t("coachLibrary.loadFailed"),
        openClients: t("coachLibrary.openClients"),
        createTemplate: t("coachLibrary.createTemplate"),
        useTemplate: t("coachLibrary.useTemplate"),
        lastUsed: t("coachLibrary.lastUsed"),
        lastUsedNever: t("coachLibrary.lastUsedNever"),
        relativeToday: t("coachClients.relative.today"),
        relativeYesterday: t("coachClients.relative.yesterday"),
        relativeDaysAgo: t("coachClients.relative.daysAgo"),
      }}
    />
  )
}
