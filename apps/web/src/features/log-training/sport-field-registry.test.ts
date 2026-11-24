import { describe, expect, it } from "vitest"
import {
  createDefaultExerciseRow,
  getSportFields,
  sanitizeRowOnSportChange,
  sportFieldRegistry,
} from "./sport-field-registry"
import { SPORT_TYPES } from "./types"
import { logTrainingDraftToInput } from "./draft-to-input"
import type { LogTrainingDraft } from "./types"

describe("sportFieldRegistry", () => {
  it("covers every MVP sport type", () => {
    for (const sport of SPORT_TYPES) {
      expect(sportFieldRegistry[sport]).toBeDefined()
      expect(getSportFields(sport).length).toBeGreaterThan(0)
    }
  })

  it("lists strength fields for weight lifting", () => {
    const keys = getSportFields("weight_lifting").map((field) => field.key)
    expect(keys).toEqual(
      expect.arrayContaining(["reps", "weight_kg", "rpe", "rest_sec", "notes"])
    )
    expect(sportFieldRegistry.weight_lifting.showSetsCount).toBe(true)
  })

  it("requires reps for weight lifting rows", () => {
    const row = createDefaultExerciseRow("weight_lifting")
    expect(
      sportFieldRegistry.weight_lifting.validateRow({ ...row, reps: null })
    ).toBe("repsRequired")
    expect(sportFieldRegistry.weight_lifting.validateRow(row)).toBeNull()
  })

  it("requires distance or duration for running", () => {
    const row = {
      ...createDefaultExerciseRow("running"),
      distanceM: null,
      durationSec: null,
    }
    expect(sportFieldRegistry.running.validateRow(row)).toBe(
      "distanceOrDuration"
    )
    expect(
      sportFieldRegistry.running.validateRow({ ...row, distanceM: 5000 })
    ).toBeNull()
  })

  it("clears incompatible fields when sport changes", () => {
    const lifting = {
      ...createDefaultExerciseRow("weight_lifting"),
      id: "row-1",
      exerciseName: "Squat",
      reps: 5,
      weightKg: 100,
    }
    const running = sanitizeRowOnSportChange(lifting, "running")
    expect(running.id).toBe("row-1")
    expect(running.exerciseName).toBe("Squat")
    expect(running.reps).toBeNull()
    expect(running.weightKg).toBeNull()
  })
})

describe("logTrainingDraftToInput", () => {
  it("flattens exercise rows into workout sets", () => {
    const draft: LogTrainingDraft = {
      sportType: "weight_lifting",
      durationMinutes: 50,
      notes: "Solid session",
      exercises: [
        {
          ...createDefaultExerciseRow("weight_lifting"),
          id: "1",
          exerciseName: "Squat",
          sets: 2,
          reps: 5,
          weightKg: 100,
        },
      ],
    }
    const input = logTrainingDraftToInput(draft, "client-1")
    expect(input.client_id).toBe("client-1")
    expect(input.sets).toHaveLength(2)
    expect(input.sets[0]?.exercise_name).toBe("Squat")
    expect(input.duration_sec).toBe(3000)
  })
})
