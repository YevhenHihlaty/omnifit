import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { messageThreadPath } from "@/lib/routes"
import { MessagesView } from "@/features/messaging/MessagesView"
import { buildMessagingLabels } from "@/features/messaging/labels"
import {
  listConversationInbox,
  loadConversationThread,
  openConversationThreadByRelationship,
} from "@/features/messaging/queries"
import type { ConversationThread } from "@/features/messaging/types"

type MessagesPageProps = {
  conversationId?: string
  relationshipId?: string
}

export const MessagesPage = async ({
  conversationId,
  relationshipId,
}: MessagesPageProps) => {
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const inbox = await listConversationInbox()
  const items = inbox.success ? inbox.items : []

  let selectedThread: ConversationThread | null = null
  let selectedCounterpartName: string | null = null

  if (conversationId) {
    const loaded = await loadConversationThread(conversationId)
    if (loaded.success) {
      selectedThread = loaded.thread
    }
  } else if (relationshipId) {
    const opened = await openConversationThreadByRelationship(relationshipId)
    if (opened.success) {
      redirect(messageThreadPath(opened.thread.conversationId))
    }
  }

  if (selectedThread) {
    const match = items.find(
      (item) => item.conversationId === selectedThread?.conversationId
    )
    selectedCounterpartName =
      match?.counterpartName ??
      (user?.id === selectedThread.coachId ? "Client" : "Coach")
  }

  const viewerIsCoach = selectedThread
    ? user?.id === selectedThread.coachId
    : Boolean(user && items.some((item) => item.coachId === user.id))

  return (
    <MessagesView
      items={items}
      selectedThread={selectedThread}
      selectedCounterpartName={selectedCounterpartName}
      currentUserId={user?.id ?? ""}
      viewerIsCoach={viewerIsCoach}
      locale={locale}
      labels={buildMessagingLabels(t)}
      loadFailed={!inbox.success}
    />
  )
}
