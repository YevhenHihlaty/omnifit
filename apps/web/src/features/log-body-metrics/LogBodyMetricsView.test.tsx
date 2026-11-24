import { fireEvent, render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { LogBodyMetricsView } from "./LogBodyMetricsView"
import { buildLogBodyMetricsLabels } from "./labels"

vi.mock("./actions", () => ({
  saveBodyMetricsWithPhotos: vi.fn(),
}))

beforeAll(() => {
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:mock"),
  })
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  })
})

const labels = buildLogBodyMetricsLabels((key) => {
  const map: Record<string, string> = {
    "logBody.title": "Log body metrics",
    "logBody.subtitle": "Log weight and photos",
    "logBody.weightCardTitle": "Weight & measurements",
    "logBody.circumferencesTitle": "Circumferences (optional)",
    "logBody.weightLabel": "Weight",
    "logBody.weightUnit": "kg",
    "logBody.chestLabel": "Chest",
    "logBody.waistLabel": "Waist",
    "logBody.hipsLabel": "Hips",
    "logBody.armLabel": "Arm",
    "logBody.thighLabel": "Thigh",
    "logBody.cmUnit": "cm",
    "logBody.notesLabel": "Notes",
    "logBody.notesPlaceholder": "Optional",
    "logBody.photosTitle": "Progress photos",
    "logBody.photosRequired": "(required)",
    "logBody.photosHint": "Front, side and back required (≤2MB)",
    "logBody.dropHint": "Click or drag to upload",
    "logBody.clearPhoto": "Clear",
    "logBody.poses.front": "Front",
    "logBody.poses.side": "Side",
    "logBody.poses.back": "Back",
    "logBody.choosePhoto": "Choose photo",
    "logBody.photoSelected": "Photo selected",
    "logBody.save": "Save entry",
    "logBody.saving": "Saving…",
    "logBody.saved": "Saved",
    "logBody.saveFailed": "Save failed",
    "logBody.incompleteHint": "Add all 3 photos to save this entry",
    "logBody.photoTooLarge": "Photo too large",
    "logBody.photoBadType": "Invalid type",
    "logBody.loadFailed": "Load failed",
    "logBody.recentTitle": "Recent",
    "logBody.recentEmpty": "No recent entries",
  }
  return map[key] ?? key
})

describe("LogBodyMetricsView", () => {
  it("disables save when incomplete", () => {
    render(
      <LogBodyMetricsView initialData={{ recent: [] }} labels={labels} />
    )
    const save = screen.getByRole("button", { name: "Save entry" })
    expect(save).toBeDisabled()
    expect(
      screen.getByText("Add all 3 photos to save this entry")
    ).toBeInTheDocument()
    expect(screen.getByText("Hips")).toBeInTheDocument()
  })

  it("enables save when weight and three photos are set", () => {
    render(
      <LogBodyMetricsView initialData={{ recent: [] }} labels={labels} />
    )

    fireEvent.change(screen.getByLabelText(/Weight/i), {
      target: { value: "75" },
    })

    const file = new File(["x"], "front.jpg", { type: "image/jpeg" })
    Object.defineProperty(file, "size", { value: 1024 })

    for (const pose of ["Front", "Side", "Back"]) {
      const input = screen.getByLabelText(pose)
      fireEvent.change(input, { target: { files: [file] } })
    }

    expect(screen.getByRole("button", { name: "Save entry" })).not.toBeDisabled()
  })
})
