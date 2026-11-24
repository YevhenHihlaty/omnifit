import { ROUTES } from "@/lib/routes"

export type ClientHomeLabels = {
  greetingMorning: string
  greetingAfternoon: string
  greetingEvening: string
  caloriesToday: string
  kcalUnit: string
  noTarget: string
  protein: string
  carbs: string
  fat: string
  logMeal: string
  logTraining: string
  bodyMetrics: string
  checkinDue: string
  checkinCta: string
  comingSoon: string
  habitsTitle: string
  habitsDone: string
  habitsEmpty: string
  habitsEmptyNoCoach: string
  habitsToggleError: string
  coachesStripTitle: string
  coachesStripManage: string
  upcomingTitle: string
  upcomingNone: string
  messagesTitle: string
  messagesEmpty: string
  messagesViewAll: string
  withCoach: string
  targetChipAria: string
  zeroCoachesTitle: string
  zeroCoachesBody: string
  zeroCoachesCta: string
  minutesSuffix: string
  weightTrendTitle: string
  weightTrendCaption: string
  weightTrendEmpty: string
}

export const buildClientHomeLabels = (
  t: (key: string) => string
): ClientHomeLabels => ({
  greetingMorning: t("clientHome.greetingMorning"),
  greetingAfternoon: t("clientHome.greetingAfternoon"),
  greetingEvening: t("clientHome.greetingEvening"),
  caloriesToday: t("clientHome.caloriesToday"),
  kcalUnit: t("clientHome.kcalUnit"),
  noTarget: t("clientHome.noTarget"),
  protein: t("clientHome.protein"),
  carbs: t("clientHome.carbs"),
  fat: t("clientHome.fat"),
  logMeal: t("clientHome.logMeal"),
  logTraining: t("clientHome.logTraining"),
  bodyMetrics: t("clientHome.bodyMetrics"),
  checkinDue: t("clientHome.checkinDue"),
  checkinCta: t("clientHome.checkinCta"),
  comingSoon: t("shell.comingSoon"),
  habitsTitle: t("clientHome.habitsTitle"),
  habitsDone: t("clientHome.habitsDone"),
  habitsEmpty: t("clientHome.habitsEmpty"),
  habitsEmptyNoCoach: t("clientHome.habitsEmptyNoCoach"),
  habitsToggleError: t("clientHome.habitsToggleError"),
  coachesStripTitle: t("clientHome.coachesStripTitle"),
  coachesStripManage: t("clientHome.coachesStripManage"),
  upcomingTitle: t("clientHome.upcomingTitle"),
  upcomingNone: t("clientHome.upcomingNone"),
  messagesTitle: t("clientHome.messagesTitle"),
  messagesEmpty: t("clientHome.messagesEmpty"),
  messagesViewAll: t("clientHome.messagesViewAll"),
  withCoach: t("clientHome.withCoach"),
  targetChipAria: t("clientHome.targetChipAria"),
  zeroCoachesTitle: t("clientHome.zeroCoachesTitle"),
  zeroCoachesBody: t("clientHome.zeroCoachesBody"),
  zeroCoachesCta: t("clientHome.zeroCoachesCta"),
  minutesSuffix: t("clientHome.minutesSuffix"),
  weightTrendTitle: t("clientHome.weightTrendTitle"),
  weightTrendCaption: t("clientHome.weightTrendCaption"),
  weightTrendEmpty: t("clientHome.weightTrendEmpty"),
})

export { ROUTES }
