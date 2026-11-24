import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { SavedMealsView } from "@/features/log-meal/SavedMealsView"
import { buildSavedMealsLabels } from "@/features/log-meal/labels"
import { listSavedMeals } from "@/features/log-meal/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("savedMeals.title") }
}

export default async function ClientSavedMealsPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { meals, loadFailed } = await listSavedMeals(user.id)

  return (
    <SavedMealsView
      labels={buildSavedMealsLabels(t)}
      meals={meals}
      loadFailed={loadFailed}
    />
  )
}
