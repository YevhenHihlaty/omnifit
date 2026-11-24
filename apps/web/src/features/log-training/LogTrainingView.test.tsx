import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LogTrainingView } from "./LogTrainingView"
import { buildLogTrainingLabels } from "./labels"

vi.mock("./actions", () => ({
  saveWorkout: vi.fn(),
  saveAsTemplate: vi.fn(),
  loadTemplateAsDraft: vi.fn(),
}))

const labels = buildLogTrainingLabels((key) => {
  const map: Record<string, string> = {
    "logTraining.title": "Log training",
    "logTraining.subtitle": "Record today's workout",
    "logTraining.sportLabel": "Sport",
    "logTraining.sports.weight_lifting": "Weight lifting",
    "logTraining.sports.general_fitness": "General",
    "logTraining.sports.running": "Running",
    "logTraining.sports.cycling": "Cycling",
    "logTraining.sports.swimming": "Swimming",
    "logTraining.startModeLabel": "How to start",
    "logTraining.startBlank": "Blank workout",
    "logTraining.startTemplate": "From template",
    "logTraining.durationLabel": "Duration",
    "logTraining.durationUnit": "min",
    "logTraining.notesLabel": "Notes",
    "logTraining.notesPlaceholder": "Optional notes",
    "logTraining.exercisesTitle": "Exercises",
    "logTraining.addExercise": "Add exercise",
    "logTraining.removeExercise": "Remove",
    "logTraining.exerciseNameLabel": "Exercise",
    "logTraining.exerciseNamePlaceholder": "Exercise name",
    "logTraining.setsLabel": "Sets",
    "logTraining.fields.reps": "Reps",
    "logTraining.fields.weight": "Weight",
    "logTraining.fields.rpe": "RPE",
    "logTraining.fields.rest": "Rest",
    "logTraining.fields.setNotes": "Notes",
    "logTraining.fields.distance": "Distance",
    "logTraining.fields.duration": "Duration",
    "logTraining.fields.elevation": "Elevation",
    "logTraining.fields.power": "Power",
    "logTraining.fields.cadence": "Cadence",
    "logTraining.fields.laps": "Laps",
    "logTraining.fields.stroke": "Stroke",
    "logTraining.templatesTitle": "Templates",
    "logTraining.templatesEmpty": "No templates yet",
    "logTraining.loadTemplate": "Load",
    "logTraining.saveWorkout": "Save workout",
    "logTraining.saving": "Saving…",
    "logTraining.saved": "Saved",
    "logTraining.templateSaved": "Template saved",
    "logTraining.saveFailed": "Save failed",
    "logTraining.templateNotFound": "Template not found",
    "logTraining.saveAsTemplate": "Save as template",
    "logTraining.templateNameLabel": "Template name",
    "logTraining.templateNamePlaceholder": "Name",
    "logTraining.saveTemplate": "Save template",
    "logTraining.cancel": "Cancel",
    "logTraining.loadFailed": "Load failed",
    "logTraining.validation.exerciseName": "Name required",
    "logTraining.validation.repsRequired": "Reps required",
    "logTraining.validation.metricRequired": "Metric required",
    "logTraining.validation.distanceOrDuration": "Distance or duration",
    "logTraining.validation.noExercises": "Add an exercise",
    "logTraining.onBehalfTitle": "Log training for {name}",
    "logTraining.onBehalfSubtitle": "Attributed to you",
  }
  return map[key] ?? key
})

describe("LogTrainingView", () => {
  it("renders sport chips and save action", () => {
    render(
      <LogTrainingView
        initialData={{ templates: [] }}
        labels={labels}
      />
    )
    expect(
      screen.getByRole("heading", { name: "Log training" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("radio", { name: "Weight lifting" })
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Running" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Blank workout" })).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", { name: "Save workout" }).length
    ).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("radio", { name: "From template" }))
    expect(screen.getByText("No templates yet")).toBeInTheDocument()
  })
})
