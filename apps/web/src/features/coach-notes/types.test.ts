import { describe, expect, it } from "vitest"
import { formatNoteCreated, mapNoteRow } from "./types"

describe("mapNoteRow", () => {
  it("maps preview and client", () => {
    const note = mapNoteRow({
      id: "n1",
      title: "Session recap",
      body: "Great effort on squats today with solid depth.",
      kind: "post_training",
      client_id: "c1",
      created_at: "2026-09-20T12:00:00Z",
      client: { display_name: "Maya R." },
    })
    expect(note.kind).toBe("post_training")
    expect(note.clientName).toBe("Maya R.")
    expect(note.bodyPreview.length).toBeLessThanOrEqual(120)
  })

  it("truncates long body", () => {
    const long = "x".repeat(200)
    const note = mapNoteRow({
      id: "n2",
      title: "t",
      body: long,
      kind: "manual",
      client_id: null,
      created_at: "2026-09-20T12:00:00Z",
      client: null,
    })
    expect(note.bodyPreview.endsWith("…")).toBe(true)
  })
})

describe("formatNoteCreated", () => {
  it("formats valid dates", () => {
    expect(formatNoteCreated("2026-09-20T12:00:00Z", "en")).toMatch(/Sep/)
  })
})
