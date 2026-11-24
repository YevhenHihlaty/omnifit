"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { mapNotificationRow, type AppNotification, type NotificationRow } from "./types"

const SELECT =
  "id, kind, title, body, href, read_at, created_at, meta"

export type ListNotificationsResult =
  | { success: true; items: AppNotification[]; unreadCount: number }
  | { success: false; error: string }

export const listNotifications = async (
  limit = 40
): Promise<ListNotificationsResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const [{ data, error }, unreadRes] = await Promise.all([
    supabase
      .from("notifications")
      .select(SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100)),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ])

  if (error) return { success: false, error: "load_failed" }

  const items = ((data ?? []) as NotificationRow[]).map(mapNotificationRow)
  return {
    success: true,
    items,
    unreadCount: unreadRes.count ?? items.filter((n) => n.unread).length,
  }
}
