"use client"

import { Fragment, useCallback, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Avatar, StatusPill } from "@omnifit/ui"
import { Paperclip, Send } from "lucide-react"
import {
  markConversationRead,
  sendConversationMessage,
} from "./actions"
import {
  dayKey,
  formatBubbleTime,
  formatDayLabel,
} from "./format-message-timestamp"
import { formatMessagingError, type MessagingLabels } from "./labels"
import {
  mergeMessages,
  useConversationMessages,
} from "./useConversationMessages"
import type { ConversationMessage, ConversationThread } from "./types"

type ConversationThreadPanelProps = {
  thread: ConversationThread
  counterpartName: string
  currentUserId: string
  viewerIsCoach: boolean
  locale: string
  labels: MessagingLabels
}

export const ConversationThreadPanel = ({
  thread,
  counterpartName,
  currentUserId,
  viewerIsCoach,
  locale,
  labels,
}: ConversationThreadPanelProps) => {
  const router = useRouter()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [messages, setMessages] = useConversationMessages(
    thread.conversationId,
    thread.messages,
    true
  )

  useEffect(() => {
    setDraft("")
    setError(null)
    void markConversationRead(thread.conversationId).then(() => {
      router.refresh()
    })
  }, [thread.conversationId, router])

  const handleSend = useCallback(() => {
    const body = draft.trim()
    if (!body || isPending || thread.readOnly) return

    setError(null)
    startTransition(async () => {
      const result = await sendConversationMessage(thread.relationshipId, body)
      if (!result.success) {
        setError(formatMessagingError(result.error, labels))
        return
      }
      setMessages((current) =>
        mergeMessages(current, {
          id: result.messageId,
          conversationId: result.conversationId,
          senderId: currentUserId,
          body,
          createdAt: new Date().toISOString(),
        })
      )
      setDraft("")
      router.refresh()
    })
  }, [
    draft,
    isPending,
    thread.readOnly,
    thread.relationshipId,
    labels,
    currentUserId,
    setMessages,
    router,
  ])

  const statusLine = thread.readOnly
    ? null
    : viewerIsCoach
      ? labels.activeClientStatus
      : labels.yourCoachStatus

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversation-thread">
      <header className="flex items-center gap-3 border-b border-stone-150 px-[22px] py-3.5">
        <Avatar name={counterpartName} size="sm" className="h-[34px] w-[34px] text-[12px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-ink-900">
            {counterpartName}
          </p>
          {thread.readOnly ? (
            <StatusPill variant="inactive" label={labels.archivedPill} className="mt-0.5" />
          ) : (
            <p className="text-[11.5px] text-ink-500">{statusLine}</p>
          )}
        </div>
      </header>

      {thread.readOnly ? (
        <p
          className="border-b border-stone-150 bg-stone-150 px-5 py-2 text-center text-xs text-ink-700"
          role="status"
        >
          {labels.readOnlyBanner}
        </p>
      ) : null}

      <div
        className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-cream px-[26px] py-6"
        role="log"
        aria-label={labels.liveRegionLabel}
        aria-live="polite"
        aria-relevant="additions"
        data-testid="conversation-thread-messages"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-display text-[15px] font-bold text-ink-900">
              {labels.emptyThreadTitle}
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              {labels.emptyThreadBody}
            </p>
          </div>
        ) : (
          <MessageTimeline
            messages={messages}
            currentUserId={currentUserId}
            locale={locale}
          />
        )}
      </div>

      <form
        className="flex items-center gap-2.5 border-t border-stone-300 px-[22px] py-4"
        onSubmit={(event) => {
          event.preventDefault()
          handleSend()
        }}
      >
        <button
          type="button"
          disabled
          aria-label={labels.attachAria}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-stone-300 text-ink-700 opacity-40"
        >
          <Paperclip className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <label className="sr-only" htmlFor="conversation-composer">
          {labels.composerLabel}
        </label>
        <input
          id="conversation-composer"
          type="text"
          value={draft}
          maxLength={4000}
          disabled={isPending || thread.readOnly}
          placeholder={labels.composerPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-4 text-sm text-ink-900 outline-none focus:border-pine focus:ring-[3px] focus:ring-pine-tint disabled:opacity-60"
          data-testid="conversation-composer"
        />
        <button
          type="submit"
          disabled={isPending || thread.readOnly || !draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-pine text-cream hover:bg-pine-dark disabled:opacity-50"
          data-testid="conversation-send"
          aria-label={isPending ? labels.sending : labels.send}
        >
          <Send className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </form>
      {error ? (
        <p className="px-5 pb-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const MessageTimeline = ({
  messages,
  currentUserId,
  locale,
}: {
  messages: ConversationMessage[]
  currentUserId: string
  locale: string
}) => {
  let lastDay = ""
  return (
    <>
      {messages.map((message) => {
        const key = dayKey(message.createdAt)
        const showDay = key !== lastDay
        lastDay = key
        const isOwn = message.senderId === currentUserId
        return (
          <Fragment key={message.id}>
            {showDay ? (
              <span className="self-center rounded-full bg-stone-150 px-3 py-1 text-[11px] font-semibold text-ink-500">
                {formatDayLabel(message.createdAt, locale)}
              </span>
            ) : null}
            <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[min(100%,26rem)]">
                <div
                  className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                    isOwn
                      ? "rounded-br-sm bg-ink-900 text-cream"
                      : "rounded-bl-sm border border-stone-300 bg-surface text-ink-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
                <time
                  dateTime={message.createdAt}
                  className={`mt-1 block text-[10.5px] tabular-nums text-ink-500 ${
                    isOwn ? "text-right" : "text-left"
                  }`}
                >
                  {formatBubbleTime(message.createdAt, locale)}
                </time>
              </div>
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
