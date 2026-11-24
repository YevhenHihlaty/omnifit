import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { NotificationBell } from "@/features/notifications/NotificationBell"
import { buildNotificationLabels } from "@/features/notifications/labels"
import { listNotifications } from "@/features/notifications/queries"

/** Thin top bar with notification bell — shared by coach/client shells. */
export const AppTopBar = async () => {
  const { t } = await getServerTranslator()
  const result = await listNotifications(20)
  const items = result.success ? result.items : []
  const unreadCount = result.success ? result.unreadCount : 0

  return (
    <div className="mb-4 flex justify-end">
      <NotificationBell
        initialItems={items}
        initialUnreadCount={unreadCount}
        labels={buildNotificationLabels(t)}
      />
    </div>
  )
}
