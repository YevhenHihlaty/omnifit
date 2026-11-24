import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LogTrainingView } from "@/features/log-training/LogTrainingView"
import { buildLogTrainingLabels } from "@/features/log-training/labels"
import { loadLogTrainingPageData } from "@/features/log-training/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("logTraining.title") }
}

export default async function ClientLogTrainingPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data, loadFailed } = await loadLogTrainingPageData(user.id)

  return (
    <LogTrainingView
      initialData={data}
      labels={buildLogTrainingLabels(t)}
      loadFailed={loadFailed}
    />
  )
}
