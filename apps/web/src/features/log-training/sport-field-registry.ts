import type {
  SportType,
  TrainingExerciseRow,
  WorkoutSetFieldKey,
  WorkoutSetInput,
} from "./types"

type DraftFieldKey = keyof Pick<
  TrainingExerciseRow,
  | "reps"
  | "weightKg"
  | "durationSec"
  | "distanceM"
  | "elevationM"
  | "powerW"
  | "cadenceRpm"
  | "laps"
  | "stroke"
  | "rpe"
  | "restSec"
  | "setNotes"
>

export type SportFieldSpec = {
  key: WorkoutSetFieldKey
  draftKey: DraftFieldKey
  kind: "number" | "text"
  optional?: boolean
  min?: number
  max?: number
  step?: number
  labelKey: string
}

export type SportRegistryEntry = {
  fields: readonly SportFieldSpec[]
  showSetsCount: boolean
  defaultRow: () => TrainingExerciseRow
  /** Returns an i18n error key or null when valid. */
  validateRow: (row: TrainingExerciseRow) => string | null
}

const field = (spec: SportFieldSpec): SportFieldSpec => spec

const emptySportValues = (): Omit<
  TrainingExerciseRow,
  "id" | "exerciseName" | "sets"
> => ({
  reps: null,
  weightKg: null,
  durationSec: null,
  distanceM: null,
  elevationM: null,
  powerW: null,
  cadenceRpm: null,
  laps: null,
  stroke: null,
  rpe: null,
  restSec: null,
  setNotes: null,
})

const hasPositive = (value: number | null | undefined): boolean =>
  value != null && value > 0

const hasText = (value: string | null | undefined): boolean =>
  (value?.trim().length ?? 0) > 0

const baseRow = (
  showSetsCount: boolean,
  overrides: Partial<TrainingExerciseRow> = {}
): TrainingExerciseRow => ({
  id: crypto.randomUUID(),
  exerciseName: "",
  sets: showSetsCount ? 3 : 1,
  ...emptySportValues(),
  ...overrides,
})

const strengthFields = [
  field({
    key: "reps",
    draftKey: "reps",
    kind: "number",
    min: 1,
    labelKey: "reps",
  }),
  field({
    key: "weight_kg",
    draftKey: "weightKg",
    kind: "number",
    optional: true,
    min: 0,
    step: 0.5,
    labelKey: "weight",
  }),
  field({
    key: "rpe",
    draftKey: "rpe",
    kind: "number",
    optional: true,
    min: 1,
    max: 10,
    step: 0.5,
    labelKey: "rpe",
  }),
  field({
    key: "rest_sec",
    draftKey: "restSec",
    kind: "number",
    optional: true,
    min: 0,
    labelKey: "rest",
  }),
  field({
    key: "notes",
    draftKey: "setNotes",
    kind: "text",
    optional: true,
    labelKey: "setNotes",
  }),
] as const

const cardioFields = [
  field({
    key: "distance_m",
    draftKey: "distanceM",
    kind: "number",
    optional: true,
    min: 0,
    step: 1,
    labelKey: "distance",
  }),
  field({
    key: "duration_sec",
    draftKey: "durationSec",
    kind: "number",
    optional: true,
    min: 0,
    labelKey: "duration",
  }),
  field({
    key: "notes",
    draftKey: "setNotes",
    kind: "text",
    optional: true,
    labelKey: "setNotes",
  }),
] as const

export const sportFieldRegistry: Record<SportType, SportRegistryEntry> = {
  weight_lifting: {
    fields: strengthFields,
    showSetsCount: true,
    defaultRow: () =>
      baseRow(true, {
        reps: 10,
        weightKg: null,
      }),
    validateRow: (row) => {
      if (!hasPositive(row.reps)) return "repsRequired"
      return null
    },
  },
  general_fitness: {
    fields: [
      field({
        key: "reps",
        draftKey: "reps",
        kind: "number",
        optional: true,
        min: 1,
        labelKey: "reps",
      }),
      field({
        key: "duration_sec",
        draftKey: "durationSec",
        kind: "number",
        optional: true,
        min: 0,
        labelKey: "duration",
      }),
      field({
        key: "weight_kg",
        draftKey: "weightKg",
        kind: "number",
        optional: true,
        min: 0,
        step: 0.5,
        labelKey: "weight",
      }),
      field({
        key: "distance_m",
        draftKey: "distanceM",
        kind: "number",
        optional: true,
        min: 0,
        labelKey: "distance",
      }),
      field({
        key: "rpe",
        draftKey: "rpe",
        kind: "number",
        optional: true,
        min: 1,
        max: 10,
        step: 0.5,
        labelKey: "rpe",
      }),
      field({
        key: "notes",
        draftKey: "setNotes",
        kind: "text",
        optional: true,
        labelKey: "setNotes",
      }),
    ],
    showSetsCount: true,
    defaultRow: () => baseRow(true),
    validateRow: (row) => {
      if (
        !hasPositive(row.reps) &&
        !hasPositive(row.durationSec) &&
        !hasPositive(row.weightKg) &&
        !hasPositive(row.distanceM)
      ) {
        return "metricRequired"
      }
      return null
    },
  },
  running: {
    fields: [
      ...cardioFields.slice(0, 2),
      field({
        key: "elevation_m",
        draftKey: "elevationM",
        kind: "number",
        optional: true,
        min: 0,
        labelKey: "elevation",
      }),
      cardioFields[2]!,
    ],
    showSetsCount: false,
    defaultRow: () => baseRow(false),
    validateRow: (row) => {
      if (!hasPositive(row.distanceM) && !hasPositive(row.durationSec)) {
        return "distanceOrDuration"
      }
      return null
    },
  },
  cycling: {
    fields: [
      ...cardioFields.slice(0, 2),
      field({
        key: "power_w",
        draftKey: "powerW",
        kind: "number",
        optional: true,
        min: 0,
        labelKey: "power",
      }),
      field({
        key: "cadence_rpm",
        draftKey: "cadenceRpm",
        kind: "number",
        optional: true,
        min: 0,
        labelKey: "cadence",
      }),
      cardioFields[2]!,
    ],
    showSetsCount: false,
    defaultRow: () => baseRow(false),
    validateRow: (row) => {
      if (!hasPositive(row.distanceM) && !hasPositive(row.durationSec)) {
        return "distanceOrDuration"
      }
      return null
    },
  },
  swimming: {
    fields: [
      ...cardioFields.slice(0, 2),
      field({
        key: "laps",
        draftKey: "laps",
        kind: "number",
        optional: true,
        min: 1,
        labelKey: "laps",
      }),
      field({
        key: "stroke",
        draftKey: "stroke",
        kind: "text",
        optional: true,
        labelKey: "stroke",
      }),
      cardioFields[2]!,
    ],
    showSetsCount: false,
    defaultRow: () => baseRow(false),
    validateRow: (row) => {
      if (!hasPositive(row.distanceM) && !hasPositive(row.durationSec)) {
        return "distanceOrDuration"
      }
      return null
    },
  },
}

const draftKeyToDbKey: Record<DraftFieldKey, WorkoutSetFieldKey> = {
  reps: "reps",
  weightKg: "weight_kg",
  durationSec: "duration_sec",
  distanceM: "distance_m",
  elevationM: "elevation_m",
  powerW: "power_w",
  cadenceRpm: "cadence_rpm",
  laps: "laps",
  stroke: "stroke",
  rpe: "rpe",
  restSec: "rest_sec",
  setNotes: "notes",
}

export const getSportFields = (sport: SportType): readonly SportFieldSpec[] =>
  sportFieldRegistry[sport].fields

export const createDefaultExerciseRow = (sport: SportType): TrainingExerciseRow =>
  sportFieldRegistry[sport].defaultRow()

export const sanitizeRowOnSportChange = (
  row: TrainingExerciseRow,
  nextSport: SportType
): TrainingExerciseRow => {
  const defaults = createDefaultExerciseRow(nextSport)
  const allowedDraftKeys = new Set(
    getSportFields(nextSport).map((f) => f.draftKey)
  )

  const sanitized: TrainingExerciseRow = {
    ...defaults,
    id: row.id,
    exerciseName: row.exerciseName,
  }

  if (sportFieldRegistry[nextSport].showSetsCount) {
    sanitized.sets = row.sets > 0 ? row.sets : defaults.sets
  }

  for (const spec of getSportFields(nextSport)) {
    if (!allowedDraftKeys.has(spec.draftKey)) continue
    const value = row[spec.draftKey]
    if (spec.kind === "text") {
      Object.assign(sanitized, {
        [spec.draftKey]: hasText(value as string | null)
          ? (value as string)
          : null,
      })
      continue
    }
    Object.assign(sanitized, {
      [spec.draftKey]:
        value != null && Number(value) > 0 ? (value as number) : null,
    })
  }

  return sanitized
}

export const mapExerciseRowToWorkoutSetFields = (
  row: TrainingExerciseRow
): Partial<WorkoutSetInput> => {
  const payload: Partial<WorkoutSetInput> = {}

  for (const draftKey of Object.keys(draftKeyToDbKey) as DraftFieldKey[]) {
    const value = row[draftKey]
    const dbKey = draftKeyToDbKey[draftKey]

    if (dbKey === "stroke" || dbKey === "notes") {
      const text = typeof value === "string" ? value.trim() : ""
      if (text.length > 0) {
        payload[dbKey] = text
      }
      continue
    }

    if (value != null && Number(value) > 0) {
      payload[dbKey] = value as number
    }
  }

  return payload
}
