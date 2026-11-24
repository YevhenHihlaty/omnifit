import { headers } from "next/headers"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { WeeklyCheckinView } from "@/features/weekly-checkin/WeeklyCheckinView"
import { buildWeeklyCheckinLabels } from "@/features/weekly-checkin/labels"
import { loadWeeklyCheckinPageData } from "@/features/weekly-checkin/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("weeklyCheckin.title") }
}

export default async function ClientCheckinPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const h = await headers()
  const tz = h.get("x-vercel-ip-timezone") || "UTC"
  const { data, loadFailed } = await loadWeeklyCheckinPageData(user.id, tz)

  return (
    <WeeklyCheckinView
      initialData={data}
      labels={buildWeeklyCheckinLabels(t)}
      loadFailed={loadFailed}
    />
  )
}
