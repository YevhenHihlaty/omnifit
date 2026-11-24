"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  parseClientInvitePreview,
  type ClientInvitePreview,
} from "./client-invite-preview"

export const getClientInvitePreview = async (
  token: string
): Promise<ClientInvitePreview> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_client_invite_preview", {
    p_token: token,
  })

  if (error) {
    return { valid: false, error: "not_found" }
  }

  return parseClientInvitePreview(data)
}
