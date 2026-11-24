import type { HistoryFilter, ProgressTab } from "./types"

export type ClientProgressLabels = {
  title: string
  subtitle: string
  tabs: Record<ProgressTab, string>
  goalsTitle: string
  goalsEmpty: string
  goalsReadonlyHint: string
  primaryObjective: string
  settingsLink: string
  progressTitle: string
  weightLast90: string
  weightTrendEmpty: string
  measurementsTitle: string
  photoTimelineTitle: string
  photosEmpty: string
  addPhoto: string
  historyTitle: string
  historyEmpty: string
  historyKinds: Record<"workout" | "meal" | "metrics" | "checkin", string>
  historyFilters: Record<HistoryFilter, string>
  historyToday: string
  historyYesterday: string
  historyLoggedMeal: string
  historyCompletedWorkout: string
  historyLoggedWeight: string
  historySubmittedCheckin: string
  sports: Record<string, string>
  meals: Record<string, string>
  checkinTitle: string
  checkinCta: string
  checkinDone: string
  checkinDue: string
  checkinPastTitle: string
  checkinPastEmpty: string
  checkinShort: {
    sleep: string
    soreness: string
    stress: string
    energy: string
    motivation: string
  }
  waistLabel: string
  chestLabel: string
  armLabel: string
  weightLabel: string
  cmUnit: string
  loadFailed: string
  kgUnit: string
  logBodyLink: string
}

export const buildClientProgressLabels = (
  t: (key: string) => string
): ClientProgressLabels => ({
  title: t("clientProgress.title"),
  subtitle: t("clientProgress.subtitle"),
  tabs: {
    goals: t("clientProgress.tabs.goals"),
    progress: t("clientProgress.tabs.progress"),
    history: t("clientProgress.tabs.history"),
    checkin: t("clientProgress.tabs.checkin"),
  },
  goalsTitle: t("clientProgress.goalsTitle"),
  goalsEmpty: t("clientProgress.goalsEmpty"),
  goalsReadonlyHint: t("clientProgress.goalsReadonlyHint"),
  primaryObjective: t("clientProgress.primaryObjective"),
  settingsLink: t("clientProgress.settingsLink"),
  progressTitle: t("clientProgress.progressTitle"),
  weightLast90: t("clientProgress.weightLast90"),
  weightTrendEmpty: t("clientProgress.weightTrendEmpty"),
  measurementsTitle: t("clientProgress.measurementsTitle"),
  photoTimelineTitle: t("clientProgress.photoTimelineTitle"),
  photosEmpty: t("clientProgress.photosEmpty"),
  addPhoto: t("clientProgress.addPhoto"),
  historyTitle: t("clientProgress.historyTitle"),
  historyEmpty: t("clientProgress.historyEmpty"),
  historyKinds: {
    workout: t("clientProgress.historyKinds.workout"),
    meal: t("clientProgress.historyKinds.meal"),
    metrics: t("clientProgress.historyKinds.metrics"),
    checkin: t("clientProgress.historyKinds.checkin"),
  },
  historyFilters: {
    all: t("clientProgress.historyFilterAll"),
    meal: t("clientProgress.historyFilterFood"),
    workout: t("clientProgress.historyFilterTraining"),
    metrics: t("clientProgress.historyFilterMetrics"),
    checkin: t("clientProgress.historyFilterCheckin"),
  },
  historyToday: t("clientProgress.historyToday"),
  historyYesterday: t("clientProgress.historyYesterday"),
  historyLoggedMeal: t("clientProgress.historyLoggedMeal"),
  historyCompletedWorkout: t("clientProgress.historyCompletedWorkout"),
  historyLoggedWeight: t("clientProgress.historyLoggedWeight"),
  historySubmittedCheckin: t("clientProgress.historySubmittedCheckin"),
  sports: {
    weight_lifting: t("logTraining.sports.weight_lifting"),
    general_fitness: t("logTraining.sports.general_fitness"),
    running: t("logTraining.sports.running"),
    cycling: t("logTraining.sports.cycling"),
    swimming: t("logTraining.sports.swimming"),
  },
  meals: {
    breakfast: t("logMeal.mealTypes.breakfast"),
    lunch: t("logMeal.mealTypes.lunch"),
    dinner: t("logMeal.mealTypes.dinner"),
    snack: t("logMeal.mealTypes.snack"),
  },
  checkinTitle: t("clientProgress.checkinTitle"),
  checkinCta: t("clientProgress.checkinCta"),
  checkinDone: t("clientProgress.checkinDone"),
  checkinDue: t("clientProgress.checkinDue"),
  checkinPastTitle: t("clientProgress.checkinPastTitle"),
  checkinPastEmpty: t("clientProgress.checkinPastEmpty"),
  checkinShort: {
    sleep: t("clientProgress.checkinShort.sleep"),
    soreness: t("clientProgress.checkinShort.soreness"),
    stress: t("clientProgress.checkinShort.stress"),
    energy: t("clientProgress.checkinShort.energy"),
    motivation: t("clientProgress.checkinShort.motivation"),
  },
  waistLabel: t("clientProgress.waistLabel"),
  chestLabel: t("clientProgress.chestLabel"),
  armLabel: t("clientProgress.armLabel"),
  weightLabel: t("clientProgress.weightLabel"),
  cmUnit: t("clientProgress.cmUnit"),
  loadFailed: t("clientProgress.loadFailed"),
  kgUnit: t("clientProgress.kgUnit"),
  logBodyLink: t("clientProgress.logBodyLink"),
})
