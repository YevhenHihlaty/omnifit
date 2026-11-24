import { headers } from "next/headers"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ClientProgressView } from "@/features/client-progress/ClientProgressView"
import { buildClientProgressLabels } from "@/features/client-progress/labels"
import { loadClientProgressPageData } from "@/features/client-progress/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("clientProgress.title") }
}

export default async function ClientProgressPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const h = await headers()
  const tz = h.get("x-vercel-ip-timezone") || "UTC"
  const { data, loadFailed } = await loadClientProgressPageData(user.id, tz)

  return (
    <ClientProgressView
      initialData={data}
      labels={buildClientProgressLabels(t)}
      loadFailed={loadFailed}
    />
  )
}
