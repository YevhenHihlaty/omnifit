import { headers } from "next/headers"
import type { Metadata } from "next"
import { LogMealView } from "@/features/log-meal/LogMealView"
import { buildLogMealLabels } from "@/features/log-meal/labels"
import { loadLogMealPageData } from "@/features/log-meal/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { redirect } from "next/navigation"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("logMeal.title") }
}

export default async function ClientLogMealPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const h = await headers()
  const tz = h.get("x-vercel-ip-timezone") || "UTC"
  const { data, loadFailed } = await loadLogMealPageData(user.id, tz)

  return (
    <LogMealView
      initialData={data}
      labels={buildLogMealLabels(t)}
      loadFailed={loadFailed}
    />
  )
}
