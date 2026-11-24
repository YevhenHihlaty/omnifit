import { describe, expect, it } from "vitest"
import {
  dayKey,
  formatBubbleTime,
  formatDayLabel,
  formatInboxAge,
} from "./format-message-timestamp"
import { formatMessagePreview } from "./format-message-preview"
import {
  toListMessagesErrorCode,
  toSendMessageErrorCode,
} from "./messaging-errors"

describe("formatMessagePreview", () => {
  it("returns empty label for blank body", () => {
    expect(formatMessagePreview("  ", "None")).toBe("None")
  })

  it("collapses whitespace and truncates", () => {
    expect(formatMessagePreview("hello   world", "None")).toBe("hello world")
    const long = "a".repeat(100)
    expect(formatMessagePreview(long, "None")).toBe(`${"a".repeat(77)}…`)
  })
})

describe("formatInboxAge", () => {
  const now = new Date("2026-09-21T15:00:00")

  it("formats minutes and hours", () => {
    expect(formatInboxAge("2026-09-21T14:58:00", "en", now)).toBe("2m")
    expect(formatInboxAge("2026-09-21T13:00:00", "en", now)).toBe("2h")
  })

  it("formats yesterday", () => {
    expect(formatInboxAge("2026-09-20T12:00:00", "en", now)).toBe("Yesterday")
  })
})

describe("formatBubbleTime", () => {
  it("returns empty for invalid iso", () => {
    expect(formatBubbleTime("nope", "en")).toBe("")
  })

  it("formats clock time", () => {
    const result = formatBubbleTime("2026-09-21T09:12:00", "en-US")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("formatDayLabel / dayKey", () => {
  const now = new Date("2026-09-21T15:00:00")
  it("labels today", () => {
    expect(formatDayLabel("2026-09-21T10:00:00", "en", now)).toBe("Today")
  })
  it("groups by calendar day", () => {
    expect(dayKey("2026-09-21T10:00:00")).toBe(dayKey("2026-09-21T23:00:00"))
  })
})

describe("messaging error codes", () => {
  it("keeps known send codes", () => {
    expect(toSendMessageErrorCode("empty_body")).toBe("empty_body")
    expect(toSendMessageErrorCode("sql leak")).toBe("send_failed")
  })

  it("keeps known list codes", () => {
    expect(toListMessagesErrorCode("forbidden")).toBe("forbidden")
    expect(toListMessagesErrorCode("weird")).toBe("load_failed")
  })
})
