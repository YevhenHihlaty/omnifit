import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { WorkoutLibraryView } from "./WorkoutLibraryView"

vi.mock("@/features/log-training/actions", () => ({
  deleteWorkoutTemplate: vi.fn(async () => ({ success: true })),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

const labels = {
  title: "Workout library",
  subtitle: "Your templates",
  empty: "No templates",
  emptyHint: "Save one while logging",
  exercises: "{n} exercises",
  deleteLabel: "Delete",
  deleting: "Deleting…",
  loadFailed: "Failed",
  openClients: "Go to clients",
  createTemplate: "Create template",
  useTemplate: "Use",
  lastUsed: "Last used {when}",
  lastUsedNever: "Not used yet",
  relativeToday: "Today",
  relativeYesterday: "Yesterday",
  relativeDaysAgo: "{days} days ago",
}

describe("WorkoutLibraryView", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  it("shows empty state with clients CTA", () => {
    render(
      <WorkoutLibraryView
        templates={[]}
        labels={labels}
        sportLabels={{ weight_lifting: "Weight lifting" }}
      />
    )
    expect(screen.getByText("No templates")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Go to clients" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Create template" })).toBeTruthy()
  })

  it("lists templates with use and delete", () => {
    render(
      <WorkoutLibraryView
        templates={[
          {
            id: "t1",
            name: "Upper A",
            sportType: "weight_lifting",
            exerciseCount: 4,
            lastUsedAt: "2026-09-18T00:00:00Z",
          },
        ]}
        labels={labels}
        sportLabels={{ weight_lifting: "Weight lifting" }}
      />
    )
    expect(screen.getByText("Upper A")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Use" }).getAttribute("href")).toContain(
      "template=t1"
    )
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(window.confirm).toHaveBeenCalled()
  })
})
