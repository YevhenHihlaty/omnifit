import type { Metadata } from "next"
import { LogHubView } from "@/features/log-meal/LogHubView"
import { buildLogHubLabels } from "@/features/log-meal/labels"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("logHub.title") }
}

export default async function ClientLogHubPage() {
  const { t } = await getServerTranslator()
  return <LogHubView labels={buildLogHubLabels(t)} />
}
