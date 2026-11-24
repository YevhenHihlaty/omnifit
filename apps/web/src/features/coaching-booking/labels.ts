import type { BookingRequestSummary } from "./types"
import { formatBookingError, formatBookingSlot } from "./map-booking-request"

export type CoachBookingLabels = {
  title: string
  subtitle: string
  tabPending: string
  tabUpcoming: string
  tabPast: string
  weekPrev: string
  weekNext: string
  emptyDay: string
  emptyPendingTitle: string
  emptyPendingBody: string
  emptyUpcoming: string
  emptyUpcomingBody: string
  scheduleCta: string
  emptyPast: string
  loadFailed: string
  selectRequestHint: string
  sessionTypeLabel: string
  proposedTimeLabel: string
  paymentStatusLabel: string
  acceptCta: string
  declineCta: string
  acceptingCta: string
  decliningCta: string
  declineModalTitle: string
  declineModalSubtitle: string
  declineReasonLabel: string
  declineReasonPlaceholder: string
  declineReasonRequired: string
  declineConfirmCta: string
  cancelCta: string
  closeAria: string
  withClient: string
  minutesSuffix: string
  freeFirstLabel: string
  freeFirstHint: string
  acceptToast: string
  requestedJustNow: string
  requestedMinutesAgo: string
  requestedHoursAgo: string
  requestedDaysAgo: string
  paymentNotRequired: string
  paymentAwaiting: string
  paymentDirect: string
  paymentPaid: string
  paymentOther: string
  markPaidOffline: string
  markPaidOfflinePending: string
  acquisitionBlockedBanner: string
  acquisitionBlockedCta: string
  viewReceipt: string
  paymentActionErrors: Record<string, string>
  errorCodes: Record<string, string>
  sportLabels: Record<string, string>
}

export type ClientBookingLabels = {
  title: string
  subtitle: string
  weekPrev: string
  weekNext: string
  viewWeek: string
  viewMonth: string
  emptyDay: string
  emptyDayHint: string
  upcomingTitle: string
  loadFailed: string
  requestCta: string
  myRequestsTitle: string
  pendingStatus: string
  acceptedStatus: string
  declinedStatus: string
  requestModalTitle: string
  requestModalSubtitle: string
  coachLabel: string
  coachPlaceholder: string
  dateLabel: string
  timeLabel: string
  durationLabel: string
  sportLabel: string
  noteLabel: string
  notePlaceholder: string
  submitCta: string
  submittingCta: string
  cancelCta: string
  closeAria: string
  coachRequired: string
  dateRequired: string
  timeRequired: string
  noCoachesTitle: string
  noCoachesDescription: string
  phoneRequiredBanner: string
  phoneRequiredCta: string
  requestSuccess: string
  withCoach: string
  minutesSuffix: string
  declineReasonPrefix: string
  confirmNote: string
  payCta: string
  payPending: string
  paymentAwaiting: string
  paymentActionErrors: Record<string, string>
  checkoutEnabled: boolean
  errorCodes: Record<string, string>
  sportLabels: Record<string, string>
}

export const buildCoachBookingLabels = (
  t: (key: string) => string,
  sportLabels: Record<string, string>
): CoachBookingLabels => ({
  title: t("booking.coach.title"),
  subtitle: t("booking.coach.subtitle"),
  tabPending: t("booking.coach.tabPending"),
  tabUpcoming: t("booking.coach.tabUpcoming"),
  tabPast: t("booking.coach.tabPast"),
  weekPrev: t("booking.weekPrev"),
  weekNext: t("booking.weekNext"),
  emptyDay: t("booking.emptyDay"),
  emptyPendingTitle: t("booking.coach.emptyPendingTitle"),
  emptyPendingBody: t("booking.coach.emptyPendingBody"),
  emptyUpcoming: t("booking.coach.emptyUpcoming"),
  emptyUpcomingBody: t("booking.coach.emptyUpcomingBody"),
  scheduleCta: t("booking.coach.scheduleCta"),
  emptyPast: t("booking.coach.emptyPast"),
  loadFailed: t("booking.loadFailed"),
  selectRequestHint: t("booking.coach.selectRequestHint"),
  sessionTypeLabel: t("booking.coach.sessionTypeLabel"),
  proposedTimeLabel: t("booking.coach.proposedTimeLabel"),
  paymentStatusLabel: t("booking.coach.paymentStatusLabel"),
  acceptCta: t("booking.coach.acceptCta"),
  declineCta: t("booking.coach.declineCta"),
  acceptingCta: t("booking.coach.acceptingCta"),
  decliningCta: t("booking.coach.decliningCta"),
  declineModalTitle: t("booking.coach.declineModalTitle"),
  declineModalSubtitle: t("booking.coach.declineModalSubtitle"),
  declineReasonLabel: t("booking.coach.declineReasonLabel"),
  declineReasonPlaceholder: t("booking.coach.declineReasonPlaceholder"),
  declineReasonRequired: t("booking.coach.declineReasonRequired"),
  declineConfirmCta: t("booking.coach.declineConfirmCta"),
  cancelCta: t("booking.cancelCta"),
  closeAria: t("booking.closeAria"),
  withClient: t("booking.coach.withClient"),
  minutesSuffix: t("booking.minutesSuffix"),
  freeFirstLabel: t("booking.coach.freeFirstLabel"),
  freeFirstHint: t("booking.coach.freeFirstHint"),
  acceptToast: t("booking.coach.acceptToast"),
  requestedJustNow: t("booking.coach.requestedJustNow"),
  requestedMinutesAgo: t("booking.coach.requestedMinutesAgo"),
  requestedHoursAgo: t("booking.coach.requestedHoursAgo"),
  requestedDaysAgo: t("booking.coach.requestedDaysAgo"),
  paymentNotRequired: t("booking.payment.not_required"),
  paymentAwaiting: t("booking.payment.awaiting_payment"),
  paymentDirect: t("booking.payment.direct"),
  paymentPaid: t("booking.payment.paid"),
  paymentOther: t("booking.payment.other"),
  markPaidOffline: t("booking.coach.markPaidOffline"),
  markPaidOfflinePending: t("booking.coach.markPaidOfflinePending"),
  acquisitionBlockedBanner: t("booking.coach.acquisitionBlockedBanner"),
  acquisitionBlockedCta: t("booking.coach.acquisitionBlockedCta"),
  viewReceipt: t("booking.coach.viewReceipt"),
  paymentActionErrors: {
    not_found: t("booking.errors.not_found"),
    not_authenticated: t("booking.errors.not_authenticated"),
    forbidden: t("booking.paymentErrors.forbidden"),
    not_markable: t("booking.paymentErrors.not_markable"),
    update_failed: t("booking.errors.accept_failed"),
    generic: t("booking.errors.generic"),
  },
  errorCodes: {
    phone_required: t("booking.errors.phone_required"),
    slot_busy: t("booking.errors.slot_busy"),
    not_pending: t("booking.errors.not_pending"),
    not_found: t("booking.errors.not_found"),
    decline_reason_required: t("booking.errors.decline_reason_required"),
    reason_required: t("booking.errors.decline_reason_required"),
    not_authenticated: t("booking.errors.not_authenticated"),
    invalid_duration: t("booking.errors.invalid_duration"),
    missing_starts_at: t("booking.errors.missing_starts_at"),
    past_starts_at: t("booking.errors.past_starts_at"),
    accept_failed: t("booking.errors.accept_failed"),
    decline_failed: t("booking.errors.decline_failed"),
    create_failed: t("booking.errors.create_failed"),
    acquisition_unpaid: t("booking.errors.acquisition_unpaid"),
    generic: t("booking.errors.generic"),
  },
  sportLabels,
})

export const buildClientBookingLabels = (
  t: (key: string) => string,
  sportLabels: Record<string, string>,
  checkoutEnabled = false
): ClientBookingLabels => ({
  title: t("booking.client.title"),
  subtitle: t("booking.client.subtitle"),
  weekPrev: t("booking.weekPrev"),
  weekNext: t("booking.weekNext"),
  viewWeek: t("booking.client.viewWeek"),
  viewMonth: t("booking.client.viewMonth"),
  emptyDay: t("booking.emptyDay"),
  emptyDayHint: t("booking.client.emptyDayHint"),
  upcomingTitle: t("booking.client.upcomingTitle"),
  loadFailed: t("booking.loadFailed"),
  requestCta: t("booking.client.requestCta"),
  myRequestsTitle: t("booking.client.myRequestsTitle"),
  pendingStatus: t("booking.client.pendingStatus"),
  acceptedStatus: t("booking.client.acceptedStatus"),
  declinedStatus: t("booking.client.declinedStatus"),
  requestModalTitle: t("booking.client.requestModalTitle"),
  requestModalSubtitle: t("booking.client.requestModalSubtitle"),
  coachLabel: t("booking.client.coachLabel"),
  coachPlaceholder: t("booking.client.coachPlaceholder"),
  dateLabel: t("booking.client.dateLabel"),
  timeLabel: t("booking.client.timeLabel"),
  durationLabel: t("booking.client.durationLabel"),
  sportLabel: t("booking.client.sportLabel"),
  noteLabel: t("booking.client.noteLabel"),
  notePlaceholder: t("booking.client.notePlaceholder"),
  submitCta: t("booking.client.submitCta"),
  submittingCta: t("booking.client.submittingCta"),
  cancelCta: t("booking.cancelCta"),
  closeAria: t("booking.closeAria"),
  coachRequired: t("booking.client.coachRequired"),
  dateRequired: t("booking.client.dateRequired"),
  timeRequired: t("booking.client.timeRequired"),
  noCoachesTitle: t("booking.client.noCoachesTitle"),
  noCoachesDescription: t("booking.client.noCoachesDescription"),
  phoneRequiredBanner: t("booking.client.phoneRequiredBanner"),
  phoneRequiredCta: t("booking.client.phoneRequiredCta"),
  requestSuccess: t("booking.client.requestSuccess"),
  withCoach: t("booking.client.withCoach"),
  minutesSuffix: t("booking.minutesSuffix"),
  declineReasonPrefix: t("booking.client.declineReasonPrefix"),
  confirmNote: t("booking.client.confirmNote"),
  payCta: t("booking.client.payCta"),
  payPending: t("booking.client.payPending"),
  paymentAwaiting: t("booking.payment.awaiting_payment"),
  paymentActionErrors: {
    checkout_disabled: t("booking.paymentErrors.checkout_disabled"),
    not_found: t("booking.errors.not_found"),
    not_authenticated: t("booking.errors.not_authenticated"),
    forbidden: t("booking.paymentErrors.forbidden"),
    not_payable: t("booking.paymentErrors.not_payable"),
    missing_price: t("booking.paymentErrors.missing_price"),
    stripe_required: t("booking.paymentErrors.stripe_required"),
    stripe_not_ready: t("booking.paymentErrors.stripe_not_ready"),
    checkout_failed: t("booking.paymentErrors.checkout_failed"),
    generic: t("booking.errors.generic"),
  },
  checkoutEnabled,
  errorCodes: {
    phone_required: t("booking.errors.phone_required"),
    slot_busy: t("booking.errors.slot_busy"),
    no_active_relationship: t("booking.errors.no_active_relationship"),
    missing_coach: t("booking.errors.missing_coach"),
    duplicate_pending_request: t("booking.errors.duplicate_pending_request"),
    past_starts_at: t("booking.errors.past_starts_at"),
    missing_starts_at: t("booking.errors.missing_starts_at"),
    invalid_duration: t("booking.errors.invalid_duration"),
    create_failed: t("booking.errors.create_failed"),
    generic: t("booking.errors.generic"),
  },
  sportLabels,
})

export const resolveBookingError = (
  code: string,
  errorCodes: Record<string, string>
) => formatBookingError(code, errorCodes)

export const bookingSlotLabel = (
  request: BookingRequestSummary,
  locale: string
) =>
  formatBookingSlot(
    request.startsAt,
    request.durationMinutes,
    locale,
    request.endsAt
  )
