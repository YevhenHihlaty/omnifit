"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, EmptyState, StatusPill } from "@omnifit/ui"
import { MessageSquare, Search } from "lucide-react"
import { ROUTES, messageThreadPath } from "@/lib/routes"
import { ConversationThreadPanel } from "./ConversationThreadPanel"
import { formatMessagePreview } from "./format-message-preview"
import { formatInboxAge } from "./format-message-timestamp"
import type { MessagingLabels } from "./labels"
import type { ConversationInboxItem, ConversationThread } from "./types"

type MessagesViewProps = {
  items: ConversationInboxItem[]
  selectedThread: ConversationThread | null
  selectedCounterpartName: string | null
  currentUserId: string
  viewerIsCoach: boolean
  locale: string
  labels: MessagingLabels
  loadFailed?: boolean
}

export const MessagesView = ({
  items,
  selectedThread,
  selectedCounterpartName,
  currentUserId,
  viewerIsCoach,
  locale,
  labels,
  loadFailed = false,
}: MessagesViewProps) => {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const hasSelection = Boolean(selectedThread)
  const isEmptyInbox = items.length === 0 && !loadFailed

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const name = item.counterpartName.toLowerCase()
      const preview = (item.lastMessageBody ?? "").toLowerCase()
      return name.includes(q) || preview.includes(q)
    })
  }, [items, query])

  const handleSelect = (conversationId: string) => {
    router.push(messageThreadPath(conversationId))
  }

  if (isEmptyInbox && !hasSelection) {
    return (
      <section className="flex flex-col gap-[22px]">
        <h1 className="font-display text-[22px] font-bold text-ink-900">
          {labels.title}
        </h1>
        <EmptyState
          icon={<MessageSquare className="h-[26px] w-[26px]" aria-hidden />}
          title={labels.emptyInboxTitle}
          description={labels.emptyInboxBody}
          action={
            viewerIsCoach ? (
              <Link
                href={ROUTES.clients}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
              >
                {labels.viewClients}
              </Link>
            ) : undefined
          }
        />
      </section>
    )
  }

  return (
    <section className="flex h-[calc(100vh-5.5rem)] min-h-[520px] flex-col gap-[22px]">
      <header className="flex shrink-0 items-center gap-3">
        {hasSelection ? (
          <Link
            href={ROUTES.messages}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-pine md:hidden"
          >
            ←
          </Link>
        ) : null}
        <h1 className="font-display text-[22px] font-bold text-ink-900">
          {labels.title}
        </h1>
      </header>

      {loadFailed ? (
        <p
          className="rounded-[12px] border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {labels.loadFailed}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-300 bg-surface">
        <div
          className={`flex w-full shrink-0 flex-col border-r border-stone-300 md:w-[340px] md:max-w-[340px] ${
            hasSelection ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-stone-150 p-4">
            <label className="relative block">
              <span className="sr-only">{labels.searchPlaceholder}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-10 w-full rounded-[10px] border-[1.5px] border-stone-300 bg-cream py-0 pl-[34px] pr-3 text-[13.5px] text-ink-900 outline-none focus:border-pine focus:ring-[3px] focus:ring-pine-tint"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<MessageSquare className="h-[26px] w-[26px]" aria-hidden />}
                title={labels.emptyInboxTitle}
                description={labels.emptyInboxBody}
                className="border-0 shadow-none"
                action={
                  viewerIsCoach ? (
                    <Link
                      href={ROUTES.clients}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
                    >
                      {labels.viewClients}
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto" role="list">
              {filtered.map((item) => {
                const active =
                  selectedThread?.conversationId === item.conversationId
                const unreadN = item.unreadCount > 0 ? item.unreadCount : item.unread ? 1 : 0
                return (
                  <li key={item.conversationId}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.conversationId)}
                      className={`flex w-full items-start gap-3 border-b border-stone-150 px-4 py-3.5 text-left transition-colors ${
                        active ? "bg-pine-tint" : "hover:bg-stone-150/60"
                      }`}
                      data-testid={`message-row-${item.conversationId}`}
                      aria-current={active ? "true" : undefined}
                    >
                      <Avatar
                        name={item.counterpartName}
                        size="sm"
                        className="h-[38px] w-[38px] text-[13px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-[13.5px] font-semibold text-ink-900">
                            {item.counterpartName}
                          </span>
                          {item.lastMessageAt ? (
                            <time
                              dateTime={item.lastMessageAt}
                              className="shrink-0 text-[11px] tabular-nums text-ink-500"
                            >
                              {formatInboxAge(item.lastMessageAt, locale)}
                            </time>
                          ) : null}
                        </div>
                        <p
                          className={`mt-0.5 truncate text-[12.5px] ${
                            active ? "text-ink-700" : "text-ink-500"
                          }`}
                        >
                          {formatMessagePreview(
                            item.lastMessageBody,
                            labels.noPreview
                          )}
                        </p>
                        {item.readOnly ? (
                          <div className="mt-1">
                            <StatusPill
                              variant="inactive"
                              label={labels.archivedPill}
                            />
                          </div>
                        ) : null}
                      </div>
                      {unreadN > 0 ? (
                        <span
                          className="mt-0.5 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-pine px-1.5 text-[10px] font-bold text-cream"
                          aria-label={labels.unreadAria}
                        >
                          {unreadN > 99 ? "99+" : unreadN}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div
          className={`min-w-0 flex-1 flex-col ${
            hasSelection ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedThread && selectedCounterpartName ? (
            <ConversationThreadPanel
              thread={selectedThread}
              counterpartName={selectedCounterpartName}
              currentUserId={currentUserId}
              viewerIsCoach={viewerIsCoach}
              locale={locale}
              labels={labels}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-150 text-ink-500">
                <MessageSquare className="h-[26px] w-[26px]" aria-hidden />
              </div>
              <p className="font-display text-[15px] font-bold text-ink-900">
                {labels.selectHint}
              </p>
              <p className="max-w-sm text-[13px] text-ink-500">
                {labels.emptyThreadBody}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
