"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ClientLeaveCoachResult =
  | { success: true }
  | { success: false; error: string }

export const clientLeaveCoach = async (
  coachId: string
): Promise<ClientLeaveCoachResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase.rpc("client_leave_coach", {
    p_coach_id: coachId,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    return { success: false, error: result?.error ?? "leave_failed" }
  }

  revalidatePath(ROUTES.clientMyCoaches)
  revalidatePath(ROUTES.clientHome)

  return { success: true }
}
