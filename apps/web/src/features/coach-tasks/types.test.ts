import { describe, expect, it } from "vitest"
import { formatTaskDue, mapTaskRow } from "./types"

describe("mapTaskRow", () => {
  it("maps client name from join", () => {
    const task = mapTaskRow({
      id: "t1",
      title: "Check in",
      status: "todo",
      due_at: "2026-09-22T10:00:00Z",
      client_id: "c1",
      notes: null,
      task_type: null,
      client: { display_name: "Maya R." },
    })
    expect(task.clientName).toBe("Maya R.")
    expect(task.status).toBe("todo")
  })

  it("handles array join shape", () => {
    const task = mapTaskRow({
      id: "t2",
      title: "Done",
      status: "done",
      due_at: null,
      client_id: null,
      notes: null,
      task_type: null,
      client: [{ display_name: "x" }],
    })
    expect(task.status).toBe("done")
    expect(task.clientName).toBe("x")
  })
})

describe("formatTaskDue", () => {
  it("formats today", () => {
    const iso = new Date().toISOString()
    expect(formatTaskDue(iso, "en")).toBe("Today")
  })

  it("returns dash for missing", () => {
    expect(formatTaskDue(null, "en")).toBe("—")
  })
})
