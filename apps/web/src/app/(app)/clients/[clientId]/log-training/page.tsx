import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { LogTrainingView } from "@/features/log-training/LogTrainingView"
import { buildLogTrainingLabels } from "@/features/log-training/labels"
import { loadLogTrainingPageData } from "@/features/log-training/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { coachClientDetail, ROUTES } from "@/lib/routes"

type Props = {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ template?: string }>
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  const { clientId } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", clientId)
    .maybeSingle()
  const name = data?.display_name
    ? String(data.display_name)
    : t("logTraining.title")
  return {
    title: t("logTraining.onBehalfTitle").replace("{name}", name),
  }
}

export default async function CoachLogTrainingOnBehalfPage({
  params,
  searchParams,
}: Props) {
  const { t } = await getServerTranslator()
  const { clientId } = await params
  const { template: templateId } = await searchParams
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: rel } = await supabase
    .from("coach_client_relationships")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle()

  if (!rel) notFound()

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", clientId)
    .maybeSingle()

  const clientName =
    (profile?.display_name && String(profile.display_name).trim()) ||
    t("coachClients.logWorkoutClientFallback")

  const { data, loadFailed } = await loadLogTrainingPageData(user.id, "coach")

  return (
    <div>
      <Link
        href={coachClientDetail(clientId)}
        className="mb-4 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {clientName}
      </Link>
      <LogTrainingView
        initialData={data}
        labels={buildLogTrainingLabels(t)}
        loadFailed={loadFailed}
        onBehalfOf={{ clientId, clientName }}
        initialTemplateId={templateId?.trim() || null}
      />
    </div>
  )
}
