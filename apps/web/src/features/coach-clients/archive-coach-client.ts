"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ArchiveCoachClientResult =
  | { success: true }
  | { success: false; error: string }

export const archiveCoachClient = async (
  clientId: string
): Promise<ArchiveCoachClientResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase.rpc("coach_archive_client", {
    p_client_id: clientId,
  })

  if (error) return { success: false, error: error.message }

  const result = data as { success?: boolean; error?: string } | null
  if (!result?.success) {
    return { success: false, error: result?.error ?? "archive_failed" }
  }

  revalidatePath(ROUTES.clients)
  return { success: true }
}
