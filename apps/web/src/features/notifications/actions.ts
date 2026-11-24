"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export type NotificationActionResult =
  | { success: true }
  | { success: false; error: string }

export const markNotificationRead = async (
  notificationId: string
): Promise<NotificationActionResult> => {
  if (!notificationId.trim()) {
    return { success: false, error: "missing_id" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) return { success: false, error: "update_failed" }

  revalidatePath(ROUTES.notifications)
  return { success: true }
}

export const markAllNotificationsRead =
  async (): Promise<NotificationActionResult> => {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "not_authenticated" }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)

    if (error) return { success: false, error: "update_failed" }

    revalidatePath(ROUTES.notifications)
    return { success: true }
  }
