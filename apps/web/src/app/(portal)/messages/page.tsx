import type { Metadata } from "next"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { MessagesPage } from "@/features/messaging/MessagesPage"

type PageProps = {
  searchParams: Promise<{ relationship?: string }>
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("messaging.title") }
}

export default async function MessagesRoute({ searchParams }: PageProps) {
  const { relationship } = await searchParams
  return <MessagesPage relationshipId={relationship} />
}
