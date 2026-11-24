"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

type NotificationBellProps = {
  initialItems: AppNotification[]
  initialUnreadCount: number
  labels: NotificationLabels
}

export const NotificationBell = ({
  initialItems,
  initialUnreadCount,
  labels,
}: NotificationBellProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"unread" | "all">("unread")
  const [items, setItems] = useState(initialItems)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setItems(initialItems)
    setUnreadCount(initialUnreadCount)
  }, [initialItems, initialUnreadCount])

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const visible =
    tab === "unread" ? items.filter((n) => n.unread) : items

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
      setUnreadCount(0)
      router.refresh()
    })
  }

  const handleOpenItem = (notification: AppNotification) => {
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
        setUnreadCount((count) => Math.max(0, count - 1))
      }
      setOpen(false)
      if (notification.href) {
        router.push(notification.href)
      }
      router.refresh()
    })
  }

  const ariaLabel =
    unreadCount > 0
      ? labels.bellAriaUnread.replace("{count}", String(unreadCount))
      : labels.bellAria

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-pine bg-pine-tint text-pine-dark hover:bg-pine-tint/80"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="notification-bell"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-cream">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          className="absolute right-0 z-50 mt-3 flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-stone-300 bg-surface shadow-[0_16px_32px_rgba(20,24,28,0.14)]"
        >
          <div className="flex items-center justify-between gap-3 px-[18px] pb-2.5 pt-4">
            <h2 className="font-display text-[15px] font-bold text-ink-900">
              {labels.title}
            </h2>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isPending || unreadCount === 0}
              className="h-7 rounded-lg border-[1.5px] border-stone-300 px-2.5 text-[11px] font-semibold text-ink-900 disabled:opacity-40"
              autoFocus
            >
              {labels.markAllRead}
            </button>
          </div>

          <div
            className="flex gap-1.5 px-[18px] pb-3"
            role="tablist"
            aria-label={labels.title}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "unread"}
              onClick={() => setTab("unread")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === "unread"
                  ? "bg-pine-tint text-pine-dark"
                  : "bg-stone-150 text-ink-500"
              }`}
            >
              {labels.unreadTab.replace("{count}", String(unreadCount))}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              onClick={() => setTab("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === "all"
                  ? "bg-pine-tint text-pine-dark"
                  : "bg-stone-150 text-ink-500"
              }`}
            >
              {labels.allTab.replace("{count}", String(items.length))}
            </button>
          </div>

          <ul className="max-h-[400px] overflow-y-auto border-t border-stone-150">
            {visible.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-ink-500">
                {labels.emptyTitle}
              </li>
            ) : (
              visible.map((notification) => {
                const visual = notificationKindVisual(
                  notification.kind,
                  notification.meta,
                  notification.title
                )
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(notification)}
                      className={`flex w-full items-start gap-2.5 border-b border-stone-150 px-[18px] py-3 text-left hover:bg-stone-150/40 ${
                        notification.unread ? "bg-pine-tint/40" : ""
                      }`}
                    >
                      <span
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-ink-900 ${visual.bg} ${visual.fg ?? ""}`}
                      >
                        {visual.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-ink-900">
                          {notification.title}
                        </p>
                        {notification.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-700">
                            {notification.body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[10.5px] text-ink-500">
                          {formatNotificationAge(
                            notification.createdAt,
                            labels
                          )}
                        </p>
                      </div>
                      {notification.unread ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pine" />
                      ) : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <div className="px-[18px] py-3.5 text-center">
            <Link
              href={ROUTES.notifications}
              onClick={() => setOpen(false)}
              className="text-[12.5px] font-semibold text-plum-dark hover:underline"
            >
              {labels.viewAll}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
