import { describe, expect, it } from "vitest"
import {
  buildHistoryEntries,
  filterHistoryEntries,
  groupHistoryEntries,
  workoutAttribution,
  type HistoryLabels,
} from "./history-mappers"

const labels: HistoryLabels = {
  today: "Today",
  yesterday: "Yesterday",
  daysAgo: "{n} days ago",
  mealTypes: { breakfast: "Breakfast" },
  sportTypes: { weight_lifting: "Weight lifting" },
  loggedMeal: "Logged {meal}",
  completedWorkout: "Completed workout",
  trainingExercises: "{n} exercises",
  trainingMinutes: "{n} min",
  kcalUnit: "kcal",
  metricsWeight: "Weight logged",
  metricsWeightValue: "{value} kg",
  loggedBy: "Logged by {name}",
  loggedBySelf: "Self",
  loggedByCoach: "Logged by coach",
  withCoach: "With {name}",
}

describe("workoutAttribution", () => {
  it("shows Logged by for coach_offline", () => {
    expect(
      workoutAttribution(
        {
          source: "coach_offline",
          logged_by_name: "Taylor",
          session_coach_name: null,
        },
        labels
      )
    ).toBe("Logged by Taylor")
  })

  it("falls back when coach_offline name missing", () => {
    expect(
      workoutAttribution(
        {
          source: "coach_offline",
          logged_by_name: null,
          session_coach_name: null,
        },
        labels
      )
    ).toBe("Logged by coach")
  })

  it("shows Self for client_self", () => {
    expect(
      workoutAttribution(
        {
          source: "client_self",
          logged_by_name: "Devon",
          session_coach_name: null,
        },
        labels
      )
    ).toBe("Self")
  })

  it("combines With coach when session present", () => {
    expect(
      workoutAttribution(
        {
          source: "client_self",
          logged_by_name: null,
          session_coach_name: "Sam",
        },
        labels
      )
    ).toBe("Self · With Sam")
  })
})

describe("buildHistoryEntries", () => {
  it("sorts newest first and filters by kind", () => {
    const entries = buildHistoryEntries(
      [
        {
          id: "m1",
          meal_type: "breakfast",
          logged_at: "2026-09-21T08:00:00Z",
          calories: 400,
        },
      ],
      [
        {
          id: "w1",
          sport_type: "weight_lifting",
          logged_at: "2026-09-21T18:00:00Z",
          duration_sec: 2400,
          set_count: 5,
          source: "coach_offline",
          logged_by_name: "Taylor",
          session_coach_name: null,
        },
      ],
      [],
      labels
    )
    expect(entries[0]?.kind).toBe("training")
    expect(entries[0]?.title).toBe("Completed workout")
    expect(entries[0]?.attribution).toBe("Logged by Taylor")
    expect(entries[0]?.subtitle).toContain("40 min")
    expect(entries[1]?.title).toBe("Logged Breakfast")
    expect(entries[1]?.subtitle).toBe("400 kcal")
    expect(filterHistoryEntries(entries, "food")).toHaveLength(1)
    const groups = groupHistoryEntries(
      entries,
      new Date("2026-09-21T20:00:00Z"),
      labels
    )
    expect(groups[0]?.heading).toBe("Today")
  })
})
