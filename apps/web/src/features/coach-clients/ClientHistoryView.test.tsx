import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ClientHistoryView } from "./ClientHistoryView"

describe("ClientHistoryView", () => {
  it("filters entries by kind", () => {
    render(
      <ClientHistoryView
        rangeDays={30}
        rangeHref={(d) => `?range=${d}`}
        labels={{
          filterAll: "All",
          filterFood: "Food",
          filterTraining: "Training",
          filterMetrics: "Metrics",
          empty: "Empty",
          loadFailed: "Failed",
          range7: "Last 7 days",
          range30: "Last 30 days",
          range90: "Last 90 days",
        }}
        groups={[
          {
            dateKey: "2026-09-21",
            heading: "Today",
            entries: [
              {
                id: "w1",
                kind: "training",
                occurredAt: "2026-09-21T10:00:00Z",
                title: "Completed workout",
                subtitle: "3 sets",
                attribution: "Logged by Taylor",
              },
              {
                id: "m1",
                kind: "food",
                occurredAt: "2026-09-21T08:00:00Z",
                title: "Logged Breakfast",
                subtitle: "400 kcal",
                attribution: null,
              },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText("Completed workout")).toBeTruthy()
    expect(screen.getByText("Logged Breakfast")).toBeTruthy()
    expect(screen.getByText("Logged by Taylor")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Last 30 days" })).toBeTruthy()

    fireEvent.click(screen.getByRole("tab", { name: "Training" }))
    expect(screen.getByText("Completed workout")).toBeTruthy()
    expect(screen.queryByText("Logged Breakfast")).toBeNull()
  })
})
