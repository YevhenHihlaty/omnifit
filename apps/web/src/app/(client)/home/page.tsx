import { headers } from "next/headers"
import { ClientHomeView } from "@/features/client-home/ClientHomeView"
import { buildClientHomeLabels } from "@/features/client-home/labels"
import { getClientHomeSnapshot } from "@/features/client-home/queries"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Metadata } from "next"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("meta.clientHome") }
}

const resolveClientTimeZone = async (): Promise<string> => {
  const h = await headers()
  // Vercel edge / proxy when available; else UTC (toggle still sends browser TZ)
  return h.get("x-vercel-ip-timezone") || "UTC"
}

export default async function ClientHomePage() {
  const { t } = await getServerTranslator()
  const tz = await resolveClientTimeZone()
  const snapshot = await getClientHomeSnapshot(tz)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let displayName = "there"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.display_name) displayName = String(profile.display_name)
  }

  return (
    <ClientHomeView
      snapshot={snapshot}
      labels={buildClientHomeLabels(t)}
      displayName={displayName}
    />
  )
}
