"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES, messageThreadPath } from "@/lib/routes"
import {
  toMarkReadErrorCode,
  toSendMessageErrorCode,
} from "./messaging-errors"
import type {
  MarkConversationReadRpcResult,
  SendMessageRpcResult,
} from "./types"

export type SendConversationMessageResult =
  | { success: true; messageId: string; conversationId: string }
  | { success: false; error: string }

export type MarkConversationReadResult =
  | { success: true }
  | { success: false; error: string }

export const sendConversationMessage = async (
  relationshipId: string,
  body: string
): Promise<SendConversationMessageResult> => {
  const trimmed = body.trim()
  if (!trimmed) return { success: false, error: "empty_body" }
  if (trimmed.length > 4000) return { success: false, error: "body_too_long" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase.rpc("send_message", {
    p_relationship_id: relationshipId,
    p_body: trimmed,
  })

  if (error) return { success: false, error: "send_failed" }

  const payload = data as SendMessageRpcResult
  if (!payload?.success || !payload.message_id || !payload.conversation_id) {
    return {
      success: false,
      error: toSendMessageErrorCode(payload?.error),
    }
  }

  revalidatePath(ROUTES.messages)
  revalidatePath(messageThreadPath(payload.conversation_id))
  return {
    success: true,
    messageId: payload.message_id,
    conversationId: payload.conversation_id,
  }
}

export const markConversationRead = async (
  conversationId: string
): Promise<MarkConversationReadResult> => {
  if (!conversationId.trim()) {
    return { success: false, error: "missing_conversation" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  })

  if (error) return { success: false, error: "mark_read_failed" }

  const payload = data as MarkConversationReadRpcResult
  if (!payload?.success) {
    return {
      success: false,
      error: toMarkReadErrorCode(payload?.error),
    }
  }

  revalidatePath(ROUTES.messages)
  revalidatePath(messageThreadPath(conversationId))
  return { success: true }
}