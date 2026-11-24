export type NotificationKind =
  | "message"
  | "booking_request"
  | "booking_decision"
  | "progress_photos"
  | "payment"
  | "subscription"
  | "system"

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  body: string | null
  href: string | null
  readAt: string | null
  createdAt: string
  unread: boolean
  meta: Record<string, unknown>
}

export type NotificationRow = {
  id: string
  kind: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
  meta?: Record<string, unknown> | null
}

export const mapNotificationRow = (row: NotificationRow): AppNotification => ({
  id: row.id,
  kind: (row.kind as NotificationKind) || "system",
  title: row.title,
  body: row.body,
  href: row.href,
  readAt: row.read_at,
  createdAt: row.created_at,
  unread: row.read_at == null,
  meta: row.meta && typeof row.meta === "object" ? row.meta : {},
})
