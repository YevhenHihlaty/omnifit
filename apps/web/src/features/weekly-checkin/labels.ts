import { CHECKIN_METRICS, type CheckinMetric } from "./types"

export type WeeklyCheckinLabels = {
  title: string
  headline: string
  subtitle: string
  weekLabel: string
  weekEnding: string
  metrics: Record<CheckinMetric, string>
  metricDesc: Record<CheckinMetric, string>
  short: Record<CheckinMetric, string>
  scaleLow: string
  scaleHigh: string
  scaleHint: string
  notesLabel: string
  notesPlaceholder: string
  submit: string
  saving: string
  incompleteHint: string
  successTitle: string
  successDesc: string
  scoreOf: string
  historyTitle: string
  historyEmpty: string
  loadFailed: string
  editAgain: string
}

export const buildWeeklyCheckinLabels = (
  t: (key: string) => string
): WeeklyCheckinLabels => {
  const metrics = Object.fromEntries(
    CHECKIN_METRICS.map((metric) => [
      metric,
      t(`weeklyCheckin.metrics.${metric}`),
    ])
  ) as Record<CheckinMetric, string>

  const short = Object.fromEntries(
    CHECKIN_METRICS.map((metric) => [
      metric,
      t(`weeklyCheckin.short.${metric}`),
    ])
  ) as Record<CheckinMetric, string>

  const metricDesc = Object.fromEntries(
    CHECKIN_METRICS.map((metric) => [
      metric,
      t(`weeklyCheckin.metricDesc.${metric}`),
    ])
  ) as Record<CheckinMetric, string>

  return {
    title: t("weeklyCheckin.title"),
    headline: t("weeklyCheckin.headline"),
    subtitle: t("weeklyCheckin.subtitle"),
    weekLabel: t("weeklyCheckin.weekLabel"),
    weekEnding: t("weeklyCheckin.weekEnding"),
    metrics,
    metricDesc,
    short,
    scaleLow: t("weeklyCheckin.scaleLow"),
    scaleHigh: t("weeklyCheckin.scaleHigh"),
    scaleHint: t("weeklyCheckin.scaleHint"),
    notesLabel: t("weeklyCheckin.notesLabel"),
    notesPlaceholder: t("weeklyCheckin.notesPlaceholder"),
    submit: t("weeklyCheckin.submit"),
    saving: t("weeklyCheckin.saving"),
    incompleteHint: t("weeklyCheckin.incompleteHint"),
    successTitle: t("weeklyCheckin.successTitle"),
    successDesc: t("weeklyCheckin.successDesc"),
    scoreOf: t("weeklyCheckin.scoreOf"),
    historyTitle: t("weeklyCheckin.historyTitle"),
    historyEmpty: t("weeklyCheckin.historyEmpty"),
    loadFailed: t("weeklyCheckin.loadFailed"),
    editAgain: t("weeklyCheckin.editAgain"),
  }
}
