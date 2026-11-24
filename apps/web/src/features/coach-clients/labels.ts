/** Label bag builders for server components — keep UI strings out of views. */

export type CoachClientsLabels = {
  pageTitle: string
  pageSubtitle: string
  activeCountSubtitle: string
  addClient: string
  tabActive: string
  tabPending: string
  searchPlaceholder: string
  filterAll: string
  filterAttention: string
  filterArchived: string
  bucketOnTrack: string
  bucketAtRisk: string
  bucketNew: string
  emptyTitle: string
  emptyDescription: string
  emptyArchivedTitle: string
  emptyArchivedDescription: string
  inviteCta: string
  searchEmpty: string
  streakLabel: string
  streakDaysSuffix: string
  lastCheckinLabel: string
  calTodayLabel: string
  relativeToday: string
  relativeYesterday: string
  relativeDaysAgo: string
  previewEmpty: string
  previewMessage: string
  previewArchive: string
  previewRestore: string
  previewOpenDetail: string
  previewArchiving: string
  previewRestoring: string
  weightTrendTitle: string
  weightTrendCaption: string
  weightTrendEmpty: string
  activityTitle: string
  activityEmpty: string
  archiveConfirmTitle: string
  archiveConfirmBody: string
  archiveConfirmCta: string
  restoreConfirmTitle: string
  restoreConfirmBody: string
  restoreConfirmCta: string
  actionError: string
  cancel: string
  comingSoon: string
  weightLabel: string
  adherenceLabel: string
  weightUnit: string
}

export const buildCoachClientsLabels = (
  t: (key: string) => string
): CoachClientsLabels => ({
  pageTitle: t("coachClients.pageTitle"),
  pageSubtitle: t("coachClients.pageSubtitle"),
  activeCountSubtitle: t("coachClients.activeCountSubtitle"),
  addClient: t("coachClients.addClient"),
  tabActive: t("coachClients.tabActive"),
  tabPending: t("clientInvite.roster.tabPending"),
  searchPlaceholder: t("coachClients.searchPlaceholder"),
  filterAll: t("coachClients.filterAll"),
  filterAttention: t("coachClients.filterAttention"),
  filterArchived: t("coachClients.filterArchived"),
  bucketOnTrack: t("coachClients.bucket.onTrack"),
  bucketAtRisk: t("coachClients.bucket.atRisk"),
  bucketNew: t("coachClients.bucket.new"),
  emptyTitle: t("coachClients.emptyTitle"),
  emptyDescription: t("coachClients.emptyDescription"),
  emptyArchivedTitle: t("coachClients.emptyArchivedTitle"),
  emptyArchivedDescription: t("coachClients.emptyArchivedDescription"),
  inviteCta: t("coachClients.inviteCta"),
  searchEmpty: t("coachClients.searchEmpty"),
  streakLabel: t("coachClients.streakLabel"),
  streakDaysSuffix: t("coachClients.streakDaysSuffix"),
  lastCheckinLabel: t("coachClients.lastCheckinLabel"),
  calTodayLabel: t("coachClients.preview.calTodayLabel"),
  relativeToday: t("coachClients.relative.today"),
  relativeYesterday: t("coachClients.relative.yesterday"),
  relativeDaysAgo: t("coachClients.relative.daysAgo"),
  previewEmpty: t("coachClients.preview.empty"),
  previewMessage: t("coachClients.preview.message"),
  previewArchive: t("coachClients.preview.archive"),
  previewRestore: t("coachClients.preview.restore"),
  previewOpenDetail: t("coachClients.preview.openDetail"),
  previewArchiving: t("coachClients.preview.archiving"),
  previewRestoring: t("coachClients.preview.restoring"),
  weightTrendTitle: t("snapshot.weightTrend.title"),
  weightTrendCaption: t("snapshot.weightTrendCaption"),
  weightTrendEmpty: t("snapshot.weightTrendEmpty"),
  activityTitle: t("snapshot.activity.title"),
  activityEmpty: t("snapshot.activity.empty"),
  archiveConfirmTitle: t("coachClients.archive.confirmTitle"),
  archiveConfirmBody: t("coachClients.archive.confirmBody"),
  archiveConfirmCta: t("coachClients.archive.confirmCta"),
  restoreConfirmTitle: t("coachClients.restore.confirmTitle"),
  restoreConfirmBody: t("coachClients.restore.confirmBody"),
  restoreConfirmCta: t("coachClients.restore.confirmCta"),
  actionError: t("coachClients.actionError"),
  cancel: t("coachClients.cancel"),
  comingSoon: t("shell.comingSoon"),
  weightLabel: t("coachClients.preview.weightLabel"),
  adherenceLabel: t("coachClients.preview.adherenceLabel"),
  weightUnit: t("coachClients.preview.weightUnit"),
})

export type SnapshotLabels = {
  snapshotTitle: string
  statsStreak: string
  statsAdherence: string
  statsWeightChange: string
  statsSessions: string
  calConsumed: string
  calTarget: string
  calNoTarget: string
  habitsTitle: string
  habitsEmpty: string
  weightTrendTitle: string
  weightTrendCaption: string
  weightTrendEmpty: string
  checkinsTitle: string
  checkinsEmpty: string
  activityTitle: string
  activityEmpty: string
  upcomingTitle: string
  upcomingNone: string
  goalLabel: string
  sinceLabel: string
  streakDaysSuffix: string
  detailTabSnapshot: string
  detailTabPrograms: string
  detailTabHistory: string
  detailTabAnalytics: string
  detailTabMessages: string
  detailTabNotes: string
  comingSoon: string
  backToRoster: string
  clientInfoTitle: string
  emailLabel: string
  programLabel: string
  notesTitle: string
  notesEmpty: string
  minutesSuffix: string
  sessionFallback: string
  doneAria: string
  incompleteAria: string
  kcalUnit: string
  bucketOnTrack: string
  bucketAtRisk: string
  bucketNew: string
  programsEmpty: string
  programsEmptyBody: string
  programsViewLibrary: string
}

export const buildSnapshotLabels = (t: (key: string) => string): SnapshotLabels => ({
  snapshotTitle: t("snapshot.title"),
  statsStreak: t("snapshot.stats.streak"),
  statsAdherence: t("snapshot.stats.adherence"),
  statsWeightChange: t("snapshot.stats.weightChange"),
  statsSessions: t("snapshot.stats.sessions"),
  calConsumed: t("snapshot.cal.consumed"),
  calTarget: t("snapshot.cal.target"),
  calNoTarget: t("snapshot.cal.noTarget"),
  habitsTitle: t("snapshot.habits.title"),
  habitsEmpty: t("snapshot.habits.empty"),
  weightTrendTitle: t("snapshot.weightTrend.title"),
  weightTrendCaption: t("snapshot.weightTrendCaption"),
  weightTrendEmpty: t("snapshot.weightTrendEmpty"),
  checkinsTitle: t("snapshot.checkins.title"),
  checkinsEmpty: t("snapshot.checkinsEmpty"),
  activityTitle: t("snapshot.activity.title"),
  activityEmpty: t("snapshot.activity.empty"),
  upcomingTitle: t("snapshot.upcoming.title"),
  upcomingNone: t("snapshot.upcoming.none"),
  goalLabel: t("snapshot.goalLabel"),
  sinceLabel: t("snapshot.sinceLabel"),
  streakDaysSuffix: t("snapshot.streakDaysSuffix"),
  detailTabSnapshot: t("snapshot.tabs.snapshot"),
  detailTabPrograms: t("snapshot.tabs.programs"),
  detailTabHistory: t("snapshot.tabs.history"),
  detailTabAnalytics: t("snapshot.tabs.analytics"),
  detailTabMessages: t("snapshot.tabs.messages"),
  detailTabNotes: t("snapshot.tabs.notes"),
  comingSoon: t("shell.comingSoon"),
  backToRoster: t("snapshot.backToRoster"),
  clientInfoTitle: t("snapshot.clientInfoTitle"),
  emailLabel: t("snapshot.emailLabel"),
  programLabel: t("snapshot.programLabel"),
  notesTitle: t("snapshot.notesTitle"),
  notesEmpty: t("snapshot.notesEmpty"),
  minutesSuffix: t("snapshot.minutesSuffix"),
  sessionFallback: t("snapshot.sessionFallback"),
  doneAria: t("snapshot.doneAria"),
  incompleteAria: t("snapshot.incompleteAria"),
  kcalUnit: t("snapshot.kcalUnit"),
  bucketOnTrack: t("snapshot.bucketOnTrack"),
  bucketAtRisk: t("snapshot.bucketAtRisk"),
  bucketNew: t("snapshot.bucketNew"),
  programsEmpty: t("snapshot.programsEmpty"),
  programsEmptyBody: t("snapshot.programsEmptyBody"),
  programsViewLibrary: t("snapshot.programsViewLibrary"),
})

export const buildHistoryMapperLabels = (
  t: (key: string) => string
): import("./history-mappers").HistoryLabels => ({
  today: t("coachHistory.today"),
  yesterday: t("coachHistory.yesterday"),
  daysAgo: t("coachHistory.daysAgo"),
  mealTypes: {
    breakfast: t("coachHistory.mealTypes.breakfast"),
    lunch: t("coachHistory.mealTypes.lunch"),
    dinner: t("coachHistory.mealTypes.dinner"),
    snack: t("coachHistory.mealTypes.snack"),
  },
  sportTypes: {
    weight_lifting: t("logTraining.sports.weight_lifting"),
    general_fitness: t("logTraining.sports.general_fitness"),
    running: t("logTraining.sports.running"),
    cycling: t("logTraining.sports.cycling"),
    swimming: t("logTraining.sports.swimming"),
  },
  loggedMeal: t("coachHistory.loggedMeal"),
  completedWorkout: t("coachHistory.completedWorkout"),
  trainingExercises: t("coachHistory.trainingExercises"),
  trainingMinutes: t("coachHistory.trainingMinutes"),
  kcalUnit: t("coachHistory.kcalUnit"),
  metricsWeight: t("coachHistory.metricsWeight"),
  metricsWeightValue: t("coachHistory.metricsWeightValue"),
  loggedBy: t("coachHistory.loggedBy"),
  loggedBySelf: t("coachHistory.loggedBySelf"),
  loggedByCoach: t("coachHistory.loggedByCoach"),
  withCoach: t("coachHistory.withCoach"),
})

export type CoachHistoryUiLabels = {
  filterAll: string
  filterFood: string
  filterTraining: string
  filterMetrics: string
  empty: string
  loadFailed: string
  range7: string
  range30: string
  range90: string
}

export const buildCoachHistoryUiLabels = (
  t: (key: string) => string
): CoachHistoryUiLabels => ({
  filterAll: t("coachHistory.filterAll"),
  filterFood: t("coachHistory.filterFood"),
  filterTraining: t("coachHistory.filterTraining"),
  filterMetrics: t("coachHistory.filterMetrics"),
  empty: t("coachHistory.empty"),
  loadFailed: t("coachHistory.loadFailed"),
  range7: t("coachHistory.range7"),
  range30: t("coachHistory.range30"),
  range90: t("coachHistory.range90"),
})

export type CoachAnalyticsUiLabels = {
  adherenceTitle: string
  adherencePeriod: string
  adherenceCount: string
  weightTitle: string
  weightPeriod: string
  weightChange: string
  volumeTitle: string
  volumeSubtitle: string
  volumeEmpty: string
  volumeWeek: string
  volumeAria: string
  measurementsTitle: string
  measurementNotesTitle: string
  measurementNotesEmpty: string
  waist: string
  hips: string
  chest: string
  arm: string
  galleryTitle: string
  galleryEmpty: string
  compareTitle: string
  compareHint: string
  compareA: string
  compareB: string
  checkinCompareTitle: string
  checkinEmpty: string
  metricColumn: string
  sleep: string
  soreness: string
  stress: string
  energy: string
  motivation: string
  poseFront: string
  poseSide: string
  poseBack: string
  kgUnit: string
  cmUnit: string
  loadFailed: string
}

export const buildCoachAnalyticsUiLabels = (
  t: (key: string) => string
): CoachAnalyticsUiLabels => ({
  adherenceTitle: t("coachAnalytics.adherenceTitle"),
  adherencePeriod: t("coachAnalytics.adherencePeriod"),
  adherenceCount: t("coachAnalytics.adherenceCount"),
  weightTitle: t("coachAnalytics.weightTitle"),
  weightPeriod: t("coachAnalytics.weightPeriod"),
  weightChange: t("coachAnalytics.weightChange"),
  volumeTitle: t("coachAnalytics.volumeTitle"),
  volumeSubtitle: t("coachAnalytics.volumeSubtitle"),
  volumeEmpty: t("coachAnalytics.volumeEmpty"),
  volumeWeek: t("coachAnalytics.volumeWeek"),
  volumeAria: t("coachAnalytics.volumeAria"),
  measurementsTitle: t("coachAnalytics.measurementsTitle"),
  measurementNotesTitle: t("coachAnalytics.measurementNotesTitle"),
  measurementNotesEmpty: t("coachAnalytics.measurementNotesEmpty"),
  waist: t("coachAnalytics.waist"),
  hips: t("coachAnalytics.hips"),
  chest: t("coachAnalytics.chest"),
  arm: t("coachAnalytics.arm"),
  galleryTitle: t("coachAnalytics.galleryTitle"),
  galleryEmpty: t("coachAnalytics.galleryEmpty"),
  compareTitle: t("coachAnalytics.compareTitle"),
  compareHint: t("coachAnalytics.compareHint"),
  compareA: t("coachAnalytics.compareA"),
  compareB: t("coachAnalytics.compareB"),
  checkinCompareTitle: t("coachAnalytics.checkinCompareTitle"),
  checkinEmpty: t("coachAnalytics.checkinEmpty"),
  metricColumn: t("coachAnalytics.metricColumn"),
  sleep: t("coachAnalytics.sleep"),
  soreness: t("coachAnalytics.soreness"),
  stress: t("coachAnalytics.stress"),
  energy: t("coachAnalytics.energy"),
  motivation: t("coachAnalytics.motivation"),
  poseFront: t("coachAnalytics.poseFront"),
  poseSide: t("coachAnalytics.poseSide"),
  poseBack: t("coachAnalytics.poseBack"),
  kgUnit: t("coachAnalytics.kgUnit"),
  cmUnit: t("coachAnalytics.cmUnit"),
  loadFailed: t("coachAnalytics.loadFailed"),
})
