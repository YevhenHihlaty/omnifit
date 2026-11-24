export type NotificationLabels = {
  title: string
  subtitle: string
  markAllRead: string
  emptyTitle: string
  emptyBody: string
  settingsCta: string
  unreadTab: string
  allTab: string
  viewAll: string
  bellAria: string
  bellAriaUnread: string
  loadFailed: string
  justNow: string
  minutesAgo: string
  hoursAgo: string
  daysAgo: string
  destMessage: string
  destBooking: string
  destCalendar: string
  destClient: string
  destSettings: string
  destGeneric: string
  yesterday: string
}

export const buildNotificationLabels = (
  t: (key: string) => string
): NotificationLabels => ({
  title: t("notifications.title"),
  subtitle: t("notifications.subtitle"),
  markAllRead: t("notifications.markAllRead"),
  emptyTitle: t("notifications.emptyTitle"),
  emptyBody: t("notifications.emptyBody"),
  settingsCta: t("notifications.settingsCta"),
  unreadTab: t("notifications.unreadTab"),
  allTab: t("notifications.allTab"),
  viewAll: t("notifications.viewAll"),
  bellAria: t("notifications.bellAria"),
  bellAriaUnread: t("notifications.bellAriaUnread"),
  loadFailed: t("notifications.loadFailed"),
  justNow: t("notifications.justNow"),
  minutesAgo: t("notifications.minutesAgo"),
  hoursAgo: t("notifications.hoursAgo"),
  daysAgo: t("notifications.daysAgo"),
  destMessage: t("notifications.destMessage"),
  destBooking: t("notifications.destBooking"),
  destCalendar: t("notifications.destCalendar"),
  destClient: t("notifications.destClient"),
  destSettings: t("notifications.destSettings"),
  destGeneric: t("notifications.destGeneric"),
  yesterday: t("notifications.yesterday"),
})

export const formatNotificationAge = (
  iso: string,
  labels: NotificationLabels
): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (mins < 1) return labels.justNow
  if (mins < 60) return labels.minutesAgo.replace("{count}", String(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 24) return labels.hoursAgo.replace("{count}", String(hours))
  if (hours < 48) return labels.yesterday
  const days = Math.floor(hours / 24)
  return labels.daysAgo.replace("{count}", String(days))
}
