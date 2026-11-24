import type { Metadata } from "next"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { NotificationsView } from "@/features/notifications/NotificationsView"
import { buildNotificationLabels } from "@/features/notifications/labels"
import { listNotifications } from "@/features/notifications/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("notifications.title") }
}

export default async function NotificationsRoute() {
  const { t } = await getServerTranslator()
  const result = await listNotifications(60)
  return (
    <NotificationsView
      items={result.success ? result.items : []}
      unreadCount={result.success ? result.unreadCount : 0}
      labels={buildNotificationLabels(t)}
      loadFailed={!result.success}
    />
  )
}
