import { SPORT_TYPES, type SportType } from "./types"

export type LogTrainingLabels = {
  title: string
  subtitle: string
  onBehalfTitle: string
  onBehalfSubtitle: string
  sportLabel: string
  sports: Record<SportType, string>
  startModeLabel: string
  startBlank: string
  startTemplate: string
  durationLabel: string
  durationUnit: string
  notesLabel: string
  notesPlaceholder: string
  exercisesTitle: string
  addExercise: string
  removeExercise: string
  exerciseNameLabel: string
  exerciseNamePlaceholder: string
  setsLabel: string
  fields: Record<string, string>
  templatesTitle: string
  templatesEmpty: string
  loadTemplate: string
  saveWorkout: string
  saving: string
  saved: string
  templateSaved: string
  saveFailed: string
  templateNotFound: string
  saveAsTemplate: string
  templateNameLabel: string
  templateNamePlaceholder: string
  saveTemplate: string
  cancel: string
  loadFailed: string
  validation: {
    exerciseName: string
    repsRequired: string
    metricRequired: string
    distanceOrDuration: string
    noExercises: string
  }
}

export const buildLogTrainingLabels = (
  t: (key: string) => string
): LogTrainingLabels => {
  const sports = Object.fromEntries(
    SPORT_TYPES.map((sport) => [sport, t(`logTraining.sports.${sport}`)])
  ) as Record<SportType, string>

  return {
    title: t("logTraining.title"),
    subtitle: t("logTraining.subtitle"),
    onBehalfTitle: t("logTraining.onBehalfTitle"),
    onBehalfSubtitle: t("logTraining.onBehalfSubtitle"),
    sportLabel: t("logTraining.sportLabel"),
    sports,
    startModeLabel: t("logTraining.startModeLabel"),
    startBlank: t("logTraining.startBlank"),
    startTemplate: t("logTraining.startTemplate"),
    durationLabel: t("logTraining.durationLabel"),
    durationUnit: t("logTraining.durationUnit"),
    notesLabel: t("logTraining.notesLabel"),
    notesPlaceholder: t("logTraining.notesPlaceholder"),
    exercisesTitle: t("logTraining.exercisesTitle"),
    addExercise: t("logTraining.addExercise"),
    removeExercise: t("logTraining.removeExercise"),
    exerciseNameLabel: t("logTraining.exerciseNameLabel"),
    exerciseNamePlaceholder: t("logTraining.exerciseNamePlaceholder"),
    setsLabel: t("logTraining.setsLabel"),
    fields: {
      reps: t("logTraining.fields.reps"),
      weight: t("logTraining.fields.weight"),
      rpe: t("logTraining.fields.rpe"),
      rest: t("logTraining.fields.rest"),
      setNotes: t("logTraining.fields.setNotes"),
      distance: t("logTraining.fields.distance"),
      duration: t("logTraining.fields.duration"),
      elevation: t("logTraining.fields.elevation"),
      power: t("logTraining.fields.power"),
      cadence: t("logTraining.fields.cadence"),
      laps: t("logTraining.fields.laps"),
      stroke: t("logTraining.fields.stroke"),
    },
    templatesTitle: t("logTraining.templatesTitle"),
    templatesEmpty: t("logTraining.templatesEmpty"),
    loadTemplate: t("logTraining.loadTemplate"),
    saveWorkout: t("logTraining.saveWorkout"),
    saving: t("logTraining.saving"),
    saved: t("logTraining.saved"),
    templateSaved: t("logTraining.templateSaved"),
    saveFailed: t("logTraining.saveFailed"),
    templateNotFound: t("logTraining.templateNotFound"),
    saveAsTemplate: t("logTraining.saveAsTemplate"),
    templateNameLabel: t("logTraining.templateNameLabel"),
    templateNamePlaceholder: t("logTraining.templateNamePlaceholder"),
    saveTemplate: t("logTraining.saveTemplate"),
    cancel: t("logTraining.cancel"),
    loadFailed: t("logTraining.loadFailed"),
    validation: {
      exerciseName: t("logTraining.validation.exerciseName"),
      repsRequired: t("logTraining.validation.repsRequired"),
      metricRequired: t("logTraining.validation.metricRequired"),
      distanceOrDuration: t("logTraining.validation.distanceOrDuration"),
      noExercises: t("logTraining.validation.noExercises"),
    },
  }
}
