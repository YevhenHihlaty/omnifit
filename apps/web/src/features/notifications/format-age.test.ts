import { describe, expect, it } from "vitest"
import { formatNotificationAge, type NotificationLabels } from "./labels"
import { notificationDestinationLabel, notificationKindVisual } from "./kind-visual"
import type { AppNotification } from "./types"

const labels: NotificationLabels = {
  title: "N",
  subtitle: "S",
  markAllRead: "M",
  emptyTitle: "E",
  emptyBody: "B",
  settingsCta: "Settings CTA",
  unreadTab: "U ({count})",
  allTab: "A ({count})",
  viewAll: "V",
  bellAria: "bell",
  bellAriaUnread: "bell {count}",
  loadFailed: "F",
  justNow: "just now",
  minutesAgo: "{count}m",
  hoursAgo: "{count}h",
  daysAgo: "{count}d",
  destMessage: "Messages thread",
  destBooking: "Booking",
  destCalendar: "Calendar",
  destClient: "Client",
  destSettings: "Settings",
  destGeneric: "Open",
  yesterday: "Yesterday",
}

describe("formatNotificationAge", () => {
  it("returns just now for recent", () => {
    expect(formatNotificationAge(new Date().toISOString(), labels)).toBe(
      "just now"
    )
  })

  it("formats minutes", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatNotificationAge(iso, labels)).toBe("5m")
  })

  it("uses yesterday for ~1 day", () => {
    const iso = new Date(Date.now() - 30 * 60 * 60_000).toISOString()
    expect(formatNotificationAge(iso, labels)).toBe("Yesterday")
  })
})

describe("notificationDestinationLabel", () => {
  const base: AppNotification = {
    id: "1",
    kind: "message",
    title: "t",
    body: null,
    href: "/messages/c1",
    readAt: null,
    createdAt: "2026-09-21T10:00:00Z",
    unread: true,
    meta: {},
  }

  it("maps href to destination chip", () => {
    expect(notificationDestinationLabel(base, labels)).toBe("Messages thread")
    expect(
      notificationDestinationLabel({ ...base, href: "/sessions" }, labels)
    ).toBe("Booking")
    expect(
      notificationDestinationLabel({ ...base, href: "/settings" }, labels)
    ).toBe("Settings")
    expect(notificationDestinationLabel({ ...base, href: null }, labels)).toBeNull()
  })
})

describe("notificationKindVisual", () => {
  it("uses blush X for declined booking", () => {
    const visual = notificationKindVisual("booking_decision", {
      status: "declined",
    })
    expect(visual.bg).toBe("bg-blush")
  })
})
