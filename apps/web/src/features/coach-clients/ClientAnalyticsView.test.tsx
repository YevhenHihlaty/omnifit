import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClientAnalyticsView } from "./ClientAnalyticsView"
import type { CoachAnalyticsPageData } from "./history-analytics-queries"

const labels = {
  adherenceTitle: "Adherence",
  adherencePeriod: "Last 30 days",
  adherenceCount: "{completed} of {target} workouts",
  weightTitle: "Weight",
  weightPeriod: "Last 8 weeks",
  weightChange: "{value} kg",
  volumeTitle: "Training volume",
  volumeSubtitle: "Sets per week",
  volumeEmpty: "No volume",
  volumeWeek: "W{n}",
  volumeAria: "Training volume by week",
  measurementsTitle: "Measurements",
  measurementNotesTitle: "Measurement notes",
  measurementNotesEmpty: "No notes",
  waist: "Waist",
  hips: "Hips",
  chest: "Chest",
  arm: "Arms",
  galleryTitle: "Gallery",
  galleryEmpty: "No photos",
  compareTitle: "Compare",
  compareHint: "Pick two",
  compareA: "A",
  compareB: "B",
  checkinCompareTitle: "Check-ins",
  checkinEmpty: "No check-ins",
  metricColumn: "Metric",
  sleep: "Sleep",
  soreness: "Soreness",
  stress: "Stress",
  energy: "Energy",
  motivation: "Motivation",
  poseFront: "Front",
  poseSide: "Side",
  poseBack: "Back",
  kgUnit: "kg",
  cmUnit: "cm",
  loadFailed: "Failed",
}

const baseData: CoachAnalyticsPageData = {
  adherencePercent: 75,
  workoutsCompleted: 9,
  workoutsTarget: 12,
  weightPoints: [
    { loggedAt: "2026-09-01", weightKg: 80 },
    { loggedAt: "2026-09-10", weightKg: 79 },
  ],
  weightChangeKg: -1,
  volumeWeeks: [
    { weekStart: "2026-08-02", label: "W1", sets: 12 },
    { weekStart: "2026-08-09", label: "W2", sets: 18 },
    { weekStart: "2026-08-16", label: "W3", sets: 10 },
    { weekStart: "2026-08-23", label: "W4", sets: 22 },
    { weekStart: "2026-08-30", label: "W5", sets: 8 },
    { weekStart: "2026-09-06", label: "W6", sets: 14 },
    { weekStart: "2026-09-13", label: "W7", sets: 16 },
    { weekStart: "2026-09-20", label: "W8", sets: 4 },
  ],
  measurements: {
    waistCm: 80,
    hipsCm: 95,
    chestCm: 100,
    armCm: 35,
    loggedAt: "2026-09-10",
  },
  measurementSparks: {
    waist: [82, 81, 80],
    hips: [96, 95],
    chest: [100],
    arm: [35, 35],
  },
  measurementNotes: "Waist trending down",
  photoCheckIns: [
    {
      bodyMetricsId: "bm1",
      loggedAt: "2026-09-01T00:00:00Z",
      photos: [
        { pose: "front", url: "https://example.com/f1.jpg" },
      ],
    },
    {
      bodyMetricsId: "bm2",
      loggedAt: "2026-09-15T00:00:00Z",
      photos: [
        { pose: "front", url: "https://example.com/f2.jpg" },
      ],
    },
  ],
  checkinA: {
    weekStart: "2026-09-07",
    sleep: 4,
    soreness: 2,
    stress: 3,
    energy: 4,
    motivation: 5,
  },
  checkinB: {
    weekStart: "2026-09-14",
    sleep: 3,
    soreness: 3,
    stress: 2,
    energy: 4,
    motivation: 4,
  },
}

describe("ClientAnalyticsView", () => {
  it("renders adherence and compare controls", () => {
    render(<ClientAnalyticsView data={baseData} labels={labels} />)
    expect(screen.getByText("Adherence")).toBeTruthy()
    expect(screen.getByText("75%")).toBeTruthy()
    expect(screen.getByText("9 of 12 workouts")).toBeTruthy()
    expect(screen.getByText("Last 8 weeks")).toBeTruthy()
    expect(screen.getByText("Training volume")).toBeTruthy()
    expect(screen.getByText("Hips")).toBeTruthy()
    expect(screen.getByText("Waist trending down")).toBeTruthy()
    expect(screen.getByText("Compare")).toBeTruthy()
    expect(screen.getByText("Sleep")).toBeTruthy()
    expect(screen.getByText("Metric")).toBeTruthy()
  })
})
