import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ClientProgressView } from "./ClientProgressView"
import { buildClientProgressLabels } from "./labels"
import type { ClientProgressPageData } from "./types"

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const labels = buildClientProgressLabels((key) => {
  const map: Record<string, string> = {
    "clientProgress.title": "Progress",
    "clientProgress.subtitle": "Goals, trends and history",
    "clientProgress.tabs.goals": "Goals",
    "clientProgress.tabs.progress": "Progress",
    "clientProgress.tabs.history": "History",
    "clientProgress.tabs.checkin": "Check-in",
    "clientProgress.goalsTitle": "Your goal",
    "clientProgress.goalsEmpty": "No goal set yet",
    "clientProgress.goalsReadonlyHint": "Edit goal in settings",
    "clientProgress.primaryObjective": "Primary objective",
    "clientProgress.settingsLink": "Open settings",
    "clientProgress.progressTitle": "Weight trend",
    "clientProgress.weightLast90": "Last 90 days",
    "clientProgress.weightTrendEmpty": "No weight logs yet",
    "clientProgress.measurementsTitle": "Measurements",
    "clientProgress.photoTimelineTitle": "Photo timeline",
    "clientProgress.photosEmpty": "No photos yet",
    "clientProgress.addPhoto": "Add photos",
    "clientProgress.historyTitle": "Recent activity",
    "clientProgress.historyEmpty": "Nothing logged yet",
    "clientProgress.historyKinds.workout": "Workout",
    "clientProgress.historyKinds.meal": "Meal",
    "clientProgress.historyKinds.metrics": "Metrics",
    "clientProgress.historyKinds.checkin": "Check-in",
    "clientProgress.historyFilterAll": "All",
    "clientProgress.historyFilterFood": "Food",
    "clientProgress.historyFilterTraining": "Training",
    "clientProgress.historyFilterMetrics": "Metrics",
    "clientProgress.historyFilterCheckin": "Check-in",
    "clientProgress.historyToday": "Today",
    "clientProgress.historyYesterday": "Yesterday",
    "clientProgress.historyLoggedMeal": "Logged {meal}",
    "clientProgress.historyCompletedWorkout": "Completed workout — {sport}",
    "clientProgress.historyLoggedWeight": "Logged weight — {weight} {unit}",
    "clientProgress.historySubmittedCheckin": "Submitted weekly check-in",
    "logTraining.sports.weight_lifting": "Weight lifting",
    "logTraining.sports.general_fitness": "General",
    "logTraining.sports.running": "Running",
    "logTraining.sports.cycling": "Cycling",
    "logTraining.sports.swimming": "Swimming",
    "logMeal.mealTypes.breakfast": "Breakfast",
    "logMeal.mealTypes.lunch": "Lunch",
    "logMeal.mealTypes.dinner": "Dinner",
    "logMeal.mealTypes.snack": "Snack",
    "clientProgress.checkinTitle": "This week's check-in",
    "clientProgress.checkinCta": "Open check-in",
    "clientProgress.checkinDone": "Submitted for this week",
    "clientProgress.checkinDue": "This week's check-in is due.",
    "clientProgress.checkinPastTitle": "Past scores",
    "clientProgress.checkinPastEmpty": "No past check-ins",
    "clientProgress.checkinShort.sleep": "Sl",
    "clientProgress.checkinShort.soreness": "So",
    "clientProgress.checkinShort.stress": "St",
    "clientProgress.checkinShort.energy": "E",
    "clientProgress.checkinShort.motivation": "M",
    "clientProgress.waistLabel": "Waist",
    "clientProgress.chestLabel": "Chest",
    "clientProgress.armLabel": "Arm",
    "clientProgress.weightLabel": "Weight",
    "clientProgress.cmUnit": "cm",
    "clientProgress.loadFailed": "Load failed",
    "clientProgress.kgUnit": "kg",
    "clientProgress.logBodyLink": "Log body metrics",
  }
  return map[key] ?? key
})

const emptyData: ClientProgressPageData = {
  goal: "Build strength",
  weightTrend: [],
  latestMeasurements: null,
  photos: [],
  history: [],
  thisWeekCheckin: null,
  pastCheckins: [],
  weekStart: "2026-09-20",
}

describe("ClientProgressView", () => {
  it("renders tabs and goals content", () => {
    render(<ClientProgressView initialData={emptyData} labels={labels} />)
    expect(screen.getByRole("heading", { name: "Progress" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Goals" })).toBeInTheDocument()
    expect(screen.getByText("Build strength")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings"
    )
  })
})
