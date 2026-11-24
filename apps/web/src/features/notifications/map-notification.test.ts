import { describe, expect, it } from "vitest"
import { mapNotificationRow } from "./types"

describe("mapNotificationRow", () => {
  it("marks unread when read_at is null", () => {
    const n = mapNotificationRow({
      id: "n1",
      kind: "message",
      title: "New message",
      body: "Hi",
      href: "/messages/c1",
      read_at: null,
      created_at: "2026-09-21T10:00:00Z",
    })
    expect(n.unread).toBe(true)
    expect(n.kind).toBe("message")
    expect(n.meta).toEqual({})
  })

  it("marks read when read_at set", () => {
    const n = mapNotificationRow({
      id: "n2",
      kind: "booking_request",
      title: "Request",
      body: null,
      href: null,
      read_at: "2026-09-21T11:00:00Z",
      created_at: "2026-09-21T10:00:00Z",
      meta: { status: "accepted" },
    })
    expect(n.unread).toBe(false)
    expect(n.meta).toEqual({ status: "accepted" })
  })
})
