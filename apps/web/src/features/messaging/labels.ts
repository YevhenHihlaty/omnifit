export type MessagingLabels = {
  title: string
  searchPlaceholder: string
  emptyInboxTitle: string
  emptyInboxBody: string
  viewClients: string
  emptyThreadTitle: string
  emptyThreadBody: string
  selectHint: string
  composerLabel: string
  composerPlaceholder: string
  send: string
  sending: string
  attachAria: string
  liveRegionLabel: string
  unreadAria: string
  readOnlyBanner: string
  archivedPill: string
  activeClientStatus: string
  yourCoachStatus: string
  loadFailed: string
  noPreview: string
  errorCodes: Record<string, string>
}

export const buildMessagingLabels = (
  t: (key: string) => string
): MessagingLabels => ({
  title: t("messaging.title"),
  searchPlaceholder: t("messaging.searchPlaceholder"),
  emptyInboxTitle: t("messaging.emptyInboxTitle"),
  emptyInboxBody: t("messaging.emptyInboxBody"),
  viewClients: t("messaging.viewClients"),
  emptyThreadTitle: t("messaging.emptyThreadTitle"),
  emptyThreadBody: t("messaging.emptyThreadBody"),
  selectHint: t("messaging.selectHint"),
  composerLabel: t("messaging.composerLabel"),
  composerPlaceholder: t("messaging.composerPlaceholder"),
  send: t("messaging.send"),
  sending: t("messaging.sending"),
  attachAria: t("messaging.attachAria"),
  liveRegionLabel: t("messaging.liveRegionLabel"),
  unreadAria: t("messaging.unreadAria"),
  readOnlyBanner: t("messaging.readOnlyBanner"),
  archivedPill: t("messaging.archivedPill"),
  activeClientStatus: t("messaging.activeClientStatus"),
  yourCoachStatus: t("messaging.yourCoachStatus"),
  loadFailed: t("messaging.loadFailed"),
  noPreview: t("messaging.noPreview"),
  errorCodes: {
    not_authenticated: t("messaging.errors.not_authenticated"),
    missing_relationship: t("messaging.errors.missing_relationship"),
    empty_body: t("messaging.errors.empty_body"),
    body_too_long: t("messaging.errors.body_too_long"),
    relationship_not_found: t("messaging.errors.relationship_not_found"),
    relationship_not_active: t("messaging.errors.relationship_not_active"),
    forbidden: t("messaging.errors.forbidden"),
    no_active_relationship: t("messaging.errors.no_active_relationship"),
    send_failed: t("messaging.errors.send_failed"),
    mark_read_failed: t("messaging.errors.mark_read_failed"),
    load_failed: t("messaging.errors.load_failed"),
    missing_conversation: t("messaging.errors.missing_conversation"),
    not_found: t("messaging.errors.not_found"),
  },
})

export const formatMessagingError = (
  code: string,
  labels: MessagingLabels
): string => labels.errorCodes[code] ?? labels.errorCodes.send_failed
