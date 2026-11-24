import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WeeklyCheckinView } from "./WeeklyCheckinView"
import { buildWeeklyCheckinLabels } from "./labels"
import { isCheckinComplete, emptyScores } from "./types"
import { weekStartSundayIso } from "./week-start"

vi.mock("./actions", () => ({
  upsertWeeklyCheckin: vi.fn(async () => ({ success: true })),
}))

const labels = buildWeeklyCheckinLabels((key) => {
  const map: Record<string, string> = {
    "weeklyCheckin.title": "Weekly check-in",
    "weeklyCheckin.headline": "How was your week?",
    "weeklyCheckin.subtitle": "How was your week?",
    "weeklyCheckin.weekLabel": "Week of {date}",
    "weeklyCheckin.weekEnding": "Week ending {date}",
    "weeklyCheckin.metrics.sleep": "Sleep",
    "weeklyCheckin.metrics.soreness": "Soreness",
    "weeklyCheckin.metrics.stress": "Stress",
    "weeklyCheckin.metrics.energy": "Energy",
    "weeklyCheckin.metrics.motivation": "Motivation",
    "weeklyCheckin.short.sleep": "Sl",
    "weeklyCheckin.short.soreness": "So",
    "weeklyCheckin.short.stress": "St",
    "weeklyCheckin.short.energy": "E",
    "weeklyCheckin.short.motivation": "M",
    "weeklyCheckin.scaleHint": "1 low · 5 high",
    "weeklyCheckin.notesLabel": "Notes",
    "weeklyCheckin.notesPlaceholder": "Optional",
    "weeklyCheckin.submit": "Submit check-in",
    "weeklyCheckin.saving": "Saving…",
    "weeklyCheckin.incompleteHint": "Rate all five scales",
    "weeklyCheckin.successTitle": "Check-in submitted",
    "weeklyCheckin.successDesc": "Your coaches can review this.",
    "weeklyCheckin.scoreOf": "{score} / {max}",
    "weeklyCheckin.historyTitle": "Past weeks",
    "weeklyCheckin.historyEmpty": "No past check-ins",
    "weeklyCheckin.loadFailed": "Load failed",
    "weeklyCheckin.editAgain": "Edit responses",
  }
  return map[key] ?? key
})

describe("isCheckinComplete", () => {
  it("requires all five sliders", () => {
    const scores = emptyScores()
    expect(isCheckinComplete(scores)).toBe(false)
    scores.sleep = 3
    scores.soreness = 2
    scores.stress = 4
    scores.energy = 5
    expect(isCheckinComplete(scores)).toBe(false)
    scores.motivation = 4
    expect(isCheckinComplete(scores)).toBe(true)
  })
})

describe("weekStartSundayIso", () => {
  it("returns Sunday for a Wednesday in UTC", () => {
    expect(weekStartSundayIso(new Date("2026-09-23T15:00:00Z"), "UTC")).toBe(
      "2026-09-20"
    )
  })
})

describe("WeeklyCheckinView", () => {
  it("disables submit until all scores are set, then upserts", async () => {
    render(
      <WeeklyCheckinView
        initialData={{ weekStart: "2026-09-20", current: null, history: [] }}
        labels={labels}
      />
    )

    const submit = screen.getByRole("button", { name: "Submit check-in" })
    expect(submit).toBeDisabled()

    for (const metric of [
      "Sleep",
      "Soreness",
      "Stress",
      "Energy",
      "Motivation",
    ]) {
      const slider = screen.getByRole("slider", { name: metric })
      fireEvent.pointerDown(slider)
      fireEvent.change(slider, { target: { value: "4" } })
    }

    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)
    expect(await screen.findByText("Check-in submitted")).toBeInTheDocument()
  })
})
