"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { mapMessageRow } from "./map-conversation"
import type { ConversationMessage, MessageRow } from "./types"

export const mergeMessages = (
  current: ConversationMessage[],
  incoming: ConversationMessage
): ConversationMessage[] => {
  if (current.some((message) => message.id === incoming.id)) {
    return current
  }
  return [...current, incoming].toSorted((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )
}

/** Subscribes to INSERT on messages for a single conversation. */
export const useConversationMessages = (
  conversationId: string | null,
  initialMessages: ConversationMessage[],
  enabled = true
): [ConversationMessage[], (updater: (current: ConversationMessage[]) => ConversationMessage[]) => void] => {
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    if (!enabled || !conversationId) return

    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null
    try {
      supabase = createSupabaseBrowserClient()
    } catch {
      return
    }

    const channel = supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const mapped = mapMessageRow(payload.new as MessageRow)
          setMessages((current) => mergeMessages(current, mapped))
        }
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [conversationId, enabled])

  return [messages, setMessages]
}
