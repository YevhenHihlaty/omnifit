import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LogBodyMetricsView } from "@/features/log-body-metrics/LogBodyMetricsView"
import { buildLogBodyMetricsLabels } from "@/features/log-body-metrics/labels"
import { loadLogBodyMetricsPageData } from "@/features/log-body-metrics/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("logBody.title") }
}

export default async function ClientLogBodyPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data, loadFailed } = await loadLogBodyMetricsPageData(user.id)

  return (
    <LogBodyMetricsView
      initialData={data}
      labels={buildLogBodyMetricsLabels(t)}
      loadFailed={loadFailed}
    />
  )
}
