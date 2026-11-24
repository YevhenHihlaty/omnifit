import { describe, expect, it } from "vitest"
import {
  mapConversationInboxRpcItem,
  mapConversationThreadRpc,
  mapMessageRow,
} from "./map-conversation"

describe("mapMessageRow", () => {
  it("maps snake_case row", () => {
    expect(
      mapMessageRow({
        id: "m1",
        conversation_id: "c1",
        sender_id: "u1",
        body: "Hello",
        created_at: "2026-09-21T10:00:00Z",
      })
    ).toEqual({
      id: "m1",
      conversationId: "c1",
      senderId: "u1",
      body: "Hello",
      createdAt: "2026-09-21T10:00:00Z",
    })
  })
})

describe("mapConversationInboxRpcItem", () => {
  it("maps unread and archived flags", () => {
    const item = mapConversationInboxRpcItem({
      conversation_id: "c1",
      relationship_id: "r1",
      coach_id: "coach",
      client_id: "client",
      counterpart_id: "client",
      counterpart_name: "  Maya  ",
      last_message_body: "Hi",
      last_message_at: "2026-09-21T10:00:00Z",
      last_message_sender_id: "client",
      unread: true,
      unread_count: 2,
      read_only: true,
      relationship_status: "archived",
    })
    expect(item.counterpartName).toBe("Maya")
    expect(item.unread).toBe(true)
    expect(item.unreadCount).toBe(2)
    expect(item.readOnly).toBe(true)
    expect(item.relationshipStatus).toBe("archived")
  })

  it("defaults missing read_only / name", () => {
    const item = mapConversationInboxRpcItem({
      conversation_id: "c1",
      relationship_id: "r1",
      coach_id: "coach",
      client_id: "client",
      counterpart_id: "client",
      counterpart_name: "   ",
      last_message_body: null,
      last_message_at: null,
      last_message_sender_id: null,
      unread: false,
    })
    expect(item.counterpartName).toBe("User")
    expect(item.readOnly).toBe(false)
    expect(item.unreadCount).toBe(0)
    expect(item.relationshipStatus).toBe("unknown")
  })
})

describe("mapConversationThreadRpc", () => {
  it("returns null when success is false", () => {
    expect(mapConversationThreadRpc({ success: false, error: "forbidden" })).toBeNull()
  })

  it("maps thread with read_only", () => {
    const thread = mapConversationThreadRpc({
      success: true,
      conversation_id: "c1",
      relationship_id: "r1",
      coach_id: "coach",
      client_id: "client",
      read_only: true,
      relationship_status: "archived",
      messages: [
        {
          id: "m1",
          conversation_id: "c1",
          sender_id: "coach",
          body: "Hi",
          created_at: "2026-09-21T10:00:00Z",
        },
      ],
    })
    expect(thread?.readOnly).toBe(true)
    expect(thread?.messages).toHaveLength(1)
    expect(thread?.messages[0]?.body).toBe("Hi")
  })
})
