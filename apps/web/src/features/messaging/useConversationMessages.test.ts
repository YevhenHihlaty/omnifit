import { describe, expect, it } from "vitest"
import { mergeMessages } from "./useConversationMessages"
import type { ConversationMessage } from "./types"

const base = (id: string, at: string): ConversationMessage => ({
  id,
  conversationId: "c1",
  senderId: "u1",
  body: id,
  createdAt: at,
})

describe("mergeMessages", () => {
  it("dedupes by id and sorts by createdAt", () => {
    const current = [base("a", "2026-09-21T10:00:00Z")]
    const next = mergeMessages(current, base("b", "2026-09-21T09:00:00Z"))
    expect(next.map((m) => m.id)).toEqual(["b", "a"])
    expect(mergeMessages(next, base("a", "2026-09-21T11:00:00Z"))).toEqual(next)
  })
})
