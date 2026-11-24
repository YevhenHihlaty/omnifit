"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EmptyState } from "@omnifit/ui"
import { Bell } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions"
import {
  formatNotificationAge,
  type NotificationLabels,
} from "./labels"
import {
  notificationDestinationLabel,
  notificationKindVisual,
} from "./kind-visual"
import type { AppNotification } from "./types"

type NotificationsViewProps = {
  items: AppNotification[]
  labels: NotificationLabels
  loadFailed?: boolean
  unreadCount?: number
}

export const NotificationsView = ({
  items: initialItems,
  labels,
  loadFailed = false,
  unreadCount: unreadCountProp,
}: NotificationsViewProps) => {
  const router = useRouter()
  const [tab, setTab] = useState<"unread" | "all">("unread")
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()

  const unreadCount =
    unreadCountProp ?? items.filter((n) => n.unread).length
  const visible = tab === "unread" ? items.filter((n) => n.unread) : items

  const handleMarkAll = () => {
    startTransition(async () => {
      const result = await markAllNotificationsRead()
      if (!result.success) return
      setItems((current) =>
        current.map((n) => ({
          ...n,
          unread: false,
          readAt: n.readAt ?? new Date().toISOString(),
        }))
      )
      router.refresh()
    })
  }

  const handleOpen = (notification: AppNotification) => {
    startTransition(async () => {
      if (notification.unread) {
        await markNotificationRead(notification.id)
        setItems((current) =>
          current.map((n) =>
            n.id === notification.id
              ? { ...n, unread: false, readAt: new Date().toISOString() }
              : n
          )
        )
      }
      if (notification.href) router.push(notification.href)
      router.refresh()
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-display text-[26px] font-bold text-ink-900">
          {labels.title}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-500">{labels.subtitle}</p>
      </header>

      {loadFailed ? (
        <p className="text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex w-fit gap-1.5 rounded-[10px] bg-stone-150 p-1"
          role="tablist"
          aria-label={labels.title}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "unread"}
            onClick={() => setTab("unread")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${
              tab === "unread"
                ? "bg-surface text-ink-900 shadow-sm"
                : "bg-transparent text-ink-500"
            }`}
          >
            {labels.unreadTab.replace("{count}", String(unreadCount))}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
            onClick={() => setTab("all")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${
              tab === "all"
                ? "bg-surface text-ink-900 shadow-sm"
                : "bg-transparent text-ink-500"
            }`}
          >
            {labels.allTab.replace("{count}", String(items.length))}
          </button>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={isPending || unreadCount === 0}
          className="h-7 rounded-lg border-[1.5px] border-stone-300 px-2.5 text-[11px] font-semibold text-ink-900 disabled:opacity-40"
        >
          {labels.markAllRead}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-[26px] w-[26px]" aria-hidden />}
          title={labels.emptyTitle}
          description={labels.emptyBody}
          action={
            <Link
              href={ROUTES.coachSettings}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
            >
              {labels.settingsCta}
            </Link>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-stone-300 bg-surface">
          {visible.map((notification) => {
            const visual = notificationKindVisual(
              notification.kind,
              notification.meta,
              notification.title
            )
            const dest = notificationDestinationLabel(notification, labels)
            return (
              <li
                key={notification.id}
                className="border-b border-stone-150 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className="flex w-full items-start gap-4 px-[22px] py-[18px] text-left hover:bg-stone-150/40"
                >
                  <span
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-ink-900 ${visual.bg} ${visual.fg ?? ""}`}
                  >
                    {visual.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
                        {notification.body}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                      <time className="text-[11.5px] tabular-nums text-ink-500">
                        {formatNotificationAge(notification.createdAt, labels)}
                      </time>
                      {dest ? (
                        <span className="rounded-full bg-lilac px-2.5 py-0.5 text-[11px] font-semibold text-plum-dark">
                          → {dest}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {notification.unread ? (
                    <span className="mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full bg-pine" />
                  ) : (
                    <span className="mt-1.5 h-[9px] w-[9px] shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
