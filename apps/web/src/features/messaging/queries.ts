"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  mapConversationInboxRpcItem,
  mapConversationThreadRpc,
} from "./map-conversation"
import { toListMessagesErrorCode } from "./messaging-errors"
import type {
  ConversationInboxItem,
  ConversationThread,
  ListConversationInboxRpcResult,
  ListConversationMessagesRpcResult,
} from "./types"

export type ListConversationInboxResult =
  | { success: true; items: ConversationInboxItem[] }
  | { success: false; error: string }

export type LoadConversationThreadResult =
  | { success: true; thread: ConversationThread }
  | { success: false; error: string }

export const listConversationInbox =
  async (): Promise<ListConversationInboxResult> => {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "not_authenticated" }
    }

    const { data, error } = await supabase.rpc("list_conversation_inbox")
    if (error) {
      return { success: false, error: "load_failed" }
    }

    const payload = data as ListConversationInboxRpcResult
    if (!payload?.success) {
      return {
        success: false,
        error: toListMessagesErrorCode(payload?.error),
      }
    }

    return {
      success: true,
      items: (payload.items ?? []).map(mapConversationInboxRpcItem),
    }
  }

export const loadConversationThread = async (
  conversationId: string
): Promise<LoadConversationThreadResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "not_authenticated" }
  }

  if (!conversationId.trim()) {
    return { success: false, error: "missing_conversation" }
  }

  const { data, error } = await supabase.rpc("list_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: 50,
  })

  if (error) {
    return { success: false, error: "load_failed" }
  }

  const payload = data as ListConversationMessagesRpcResult
  const thread = mapConversationThreadRpc(payload)
  if (!thread) {
    return {
      success: false,
      error: toListMessagesErrorCode(payload?.error ?? "not_found"),
    }
  }

  return { success: true, thread }
}

export const openConversationThreadByRelationship = async (
  relationshipId: string
): Promise<LoadConversationThreadResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "not_authenticated" }
  }

  if (!relationshipId.trim()) {
    return { success: false, error: "missing_conversation" }
  }

  const { data, error } = await supabase.rpc("open_conversation_thread", {
    p_relationship_id: relationshipId,
    p_limit: 50,
  })

  if (error) {
    return { success: false, error: "load_failed" }
  }

  const payload = data as ListConversationMessagesRpcResult
  const thread = mapConversationThreadRpc(payload)
  if (!thread) {
    return {
      success: false,
      error: toListMessagesErrorCode(payload?.error ?? "not_found"),
    }
  }

  return { success: true, thread }
}
