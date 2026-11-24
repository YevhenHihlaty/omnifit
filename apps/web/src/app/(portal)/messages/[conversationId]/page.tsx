import type { Metadata } from "next"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { MessagesPage } from "@/features/messaging/MessagesPage"

type PageProps = {
  params: Promise<{ conversationId: string }>
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("messaging.title") }
}

export default async function MessageThreadRoute({ params }: PageProps) {
  const { conversationId } = await params
  return <MessagesPage conversationId={conversationId} />
}
