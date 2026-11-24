/** Server components: build label bags from translate(key). */
export type ClientInviteDialogLabels = {
  inviteCta: string
  dialogTitle: string
  dialogSubtitle: string
  emailLabel: string
  inlineEmailLabel: string
  sendCta: string
  sendingCta: string
  cancelCta: string
  successMessage: string
  capMessage: string
  errorGeneric: string
  errorPending: string
  errorCoachEmail: string
  errorOnRoster: string
  errorRosterLimit: string
}

export const buildClientInviteDialogLabels = (
  t: (key: string) => string
): ClientInviteDialogLabels => ({
  inviteCta: t("clientInvite.dialog.inviteCta"),
  dialogTitle: t("clientInvite.dialog.title"),
  dialogSubtitle: t("clientInvite.dialog.subtitle"),
  emailLabel: t("clientInvite.dialog.emailLabel"),
  inlineEmailLabel: t("clientInvite.dialog.inlineEmailLabel"),
  sendCta: t("clientInvite.dialog.sendCta"),
  sendingCta: t("clientInvite.dialog.sendingCta"),
  cancelCta: t("clientInvite.dialog.cancelCta"),
  successMessage: t("clientInvite.dialog.successMessage"),
  capMessage: t("clientInvite.dialog.capMessage"),
  errorGeneric: t("clientInvite.errors.generic"),
  errorPending: t("clientInvite.errors.pending"),
  errorCoachEmail: t("clientInvite.errors.emailIsCoach"),
  errorOnRoster: t("clientInvite.errors.onRoster"),
  errorRosterLimit: t("clientInvite.errors.rosterLimit"),
})

export type PendingInvitesListLabels = {
  title: string
  empty: string
  emptyHint: string
  pendingChip: string
  resend: string
  revoke: string
  resending: string
  revoking: string
  sent: string
  actionError: string
  resendSuccess: string
  revokeSuccess: string
  colEmail: string
  colStatus: string
  colActions: string
}

export const buildPendingInvitesListLabels = (
  t: (key: string) => string
): PendingInvitesListLabels => ({
  title: t("clientInvite.pending.title"),
  empty: t("clientInvite.pending.empty"),
  emptyHint: t("clientInvite.pending.emptyHint"),
  pendingChip: t("clientInvite.pending.chip"),
  resend: t("clientInvite.pending.resend"),
  revoke: t("clientInvite.pending.revoke"),
  resending: t("clientInvite.pending.resending"),
  revoking: t("clientInvite.pending.revoking"),
  sent: t("clientInvite.pending.sent"),
  actionError: t("clientInvite.pending.actionError"),
  resendSuccess: t("clientInvite.pending.resendSuccess"),
  revokeSuccess: t("clientInvite.pending.revokeSuccess"),
  colEmail: t("clientInvite.pending.colEmail"),
  colStatus: t("clientInvite.pending.colStatus"),
  colActions: t("clientInvite.pending.colActions"),
})

export type ClientInviteAcceptLabels = {
  title: string
  subtitleNewUser: string
  subtitleExistingClient: string
  passwordLabel: string
  confirmPasswordLabel: string
  passwordHint: string
  submitCta: string
  submitLoading: string
  signInCta: string
  signInHint: string
  emailMismatch: string
  openHome: string
  continueOnboarding: string
  expiredTitle: string
  expiredBody: string
  revokedTitle: string
  revokedBody: string
  errorGeneric: string
  coachRejectedTitle: string
  coachRejectedBody: string
  coachGoDashboard: string
  coachSignOut: string
  disclosureTitle: string
  disclosureBody: string
  disclosureConfirm: string
  acceptCta: string
  acceptLoading: string
  otherCoachesHeading: string
  inviteSentTo: string
  coachFallback: string
  termsAgree: string
  termsLink: string
  privacyLink: string
  previewEyebrow: string
  passwordEyebrow: string
  termsRequired: string
  coachRoleLine: string
}

export const buildClientInviteAcceptLabels = (
  t: (key: string) => string
): ClientInviteAcceptLabels => ({
  title: t("clientInvite.accept.title"),
  subtitleNewUser: t("clientInvite.accept.subtitleNewUser"),
  subtitleExistingClient: t("clientInvite.accept.subtitleExistingClient"),
  passwordLabel: t("clientInvite.accept.passwordLabel"),
  confirmPasswordLabel: t("clientInvite.accept.confirmPasswordLabel"),
  passwordHint: t("clientInvite.accept.passwordHint"),
  submitCta: t("clientInvite.accept.submitCta"),
  submitLoading: t("clientInvite.accept.submitLoading"),
  signInCta: t("clientInvite.accept.signInCta"),
  signInHint: t("clientInvite.accept.signInHint"),
  emailMismatch: t("clientInvite.accept.emailMismatch"),
  openHome: t("clientInvite.accept.openHome"),
  continueOnboarding: t("clientInvite.accept.continueOnboarding"),
  expiredTitle: t("clientInvite.accept.expiredTitle"),
  expiredBody: t("clientInvite.accept.expiredBody"),
  revokedTitle: t("clientInvite.accept.revokedTitle"),
  revokedBody: t("clientInvite.accept.revokedBody"),
  errorGeneric: t("clientInvite.accept.errorGeneric"),
  coachRejectedTitle: t("clientInvite.accept.coachRejectedTitle"),
  coachRejectedBody: t("clientInvite.accept.coachRejectedBody"),
  coachGoDashboard: t("clientInvite.accept.coachGoDashboard"),
  coachSignOut: t("clientInvite.accept.coachSignOut"),
  disclosureTitle: t("clientInvite.accept.disclosureTitle"),
  disclosureBody: t("clientInvite.accept.disclosureBody"),
  disclosureConfirm: t("clientInvite.accept.disclosureConfirm"),
  acceptCta: t("clientInvite.accept.acceptCta"),
  acceptLoading: t("clientInvite.accept.acceptLoading"),
  otherCoachesHeading: t("clientInvite.accept.otherCoachesHeading"),
  inviteSentTo: t("clientInvite.accept.inviteSentTo"),
  coachFallback: t("clientInvite.accept.coachFallback"),
  termsAgree: t("clientInvite.accept.termsAgree"),
  termsLink: t("clientInvite.accept.termsLink"),
  privacyLink: t("clientInvite.accept.privacyLink"),
  previewEyebrow: t("clientInvite.accept.previewEyebrow"),
  passwordEyebrow: t("clientInvite.accept.passwordEyebrow"),
  termsRequired: t("clientInvite.accept.termsRequired"),
  coachRoleLine: t("clientInvite.accept.coachRoleLine"),
})
