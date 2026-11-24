"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, CheckCircle2 } from "lucide-react"
import { Avatar, Button, EmptyState, StatusPill, Toggle } from "@omnifit/ui"
import {
  acceptBookingRequest,
  declineBookingRequest,
  updateCoachFreeFirstSession,
} from "./actions"
import {
  bookingSlotLabel,
  resolveBookingError,
  type CoachBookingLabels,
} from "./labels"
import type { BookingRequestSummary } from "./types"
import type { CalendarSession } from "@/features/app-calendar/types"
import {
  formatSessionDayHeading,
  formatSessionTimeRange,
  localDateKey,
  paymentPillVariant,
  resolveSessionTitle,
} from "./calendar-format"
import { formatRelativeRequestedAt } from "./map-booking-request"
import { MarkPaidOfflineButton } from "@/features/payments/SessionPaymentButtons"
import Link from "next/link"
import { ROUTES, receiptPath } from "@/lib/routes"

type CoachTab = "pending" | "upcoming" | "past"

type CoachSessionsViewProps = {
  locale: string
  pendingRequests: BookingRequestSummary[]
  sessions: CalendarSession[]
  freeFirstSession: boolean
  paymentCollection: "in_app" | "direct"
  acquisitionBlocked?: boolean
  acquisitionPayHref?: string | null
  loadFailed: boolean
  labels: CoachBookingLabels
}

const paymentLabel = (
  status: string | null,
  labels: CoachBookingLabels
) => {
  if (!status) return null
  if (status === "not_required") return labels.paymentNotRequired
  if (status === "awaiting_payment") return labels.paymentAwaiting
  if (status === "direct") return labels.paymentDirect
  if (status === "paid" || status === "paid_offline") return labels.paymentPaid
  return labels.paymentOther
}

const pendingPaymentPreview = (
  paymentCollection: "in_app" | "direct",
  labels: CoachBookingLabels
) => {
  if (paymentCollection === "in_app") {
    return {
      label: labels.paymentAwaiting,
      variant: paymentPillVariant("awaiting_payment"),
    }
  }
  return {
    label: labels.paymentDirect,
    variant: paymentPillVariant("direct"),
  }
}

export const CoachSessionsView = ({
  locale,
  pendingRequests,
  sessions,
  freeFirstSession,
  paymentCollection,
  acquisitionBlocked = false,
  acquisitionPayHref = null,
  loadFailed,
  labels,
}: CoachSessionsViewProps) => {
  const router = useRouter()
  const [tab, setTab] = useState<CoachTab>("pending")
  const [selectedId, setSelectedId] = useState<string | null>(
    pendingRequests[0]?.requestId ?? null
  )
  const [isPending, startTransition] = useTransition()
  const [busyAction, setBusyAction] = useState<"accept" | "decline" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [declineFieldError, setDeclineFieldError] = useState<string | null>(null)
  const [freeFirst, setFreeFirst] = useState(freeFirstSession)

  const nowBoundary = useMemo(() => {
    const d = new Date()
    d.setSeconds(0, 0)
    return d.getTime()
  }, [])

  const pendingPay = pendingPaymentPreview(paymentCollection, labels)

  useEffect(() => {
    if (
      selectedId &&
      pendingRequests.some((r) => r.requestId === selectedId)
    ) {
      return
    }
    setSelectedId(pendingRequests[0]?.requestId ?? null)
  }, [pendingRequests, selectedId])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!declineOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        setDeclineOpen(false)
        setDeclineReason("")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [declineOpen, isPending])

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => new Date(s.startsAt).getTime() >= nowBoundary)
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        ),
    [sessions, nowBoundary]
  )
  const past = useMemo(
    () =>
      sessions
        .filter((s) => new Date(s.startsAt).getTime() < nowBoundary)
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
        ),
    [sessions, nowBoundary]
  )

  const selected =
    pendingRequests.find((r) => r.requestId === selectedId) ?? null

  const handleAccept = (request: BookingRequestSummary) => {
    setActionError(null)
    setBusyAction("accept")
    startTransition(async () => {
      const result = await acceptBookingRequest(request.requestId)
      setBusyAction(null)
      if (!result.success) {
        setActionError(resolveBookingError(result.error, labels.errorCodes))
        return
      }
      setToast(
        labels.acceptToast
          .replace("{name}", request.counterpartName)
          .replace("{when}", bookingSlotLabel(request, locale))
      )
      router.refresh()
    })
  }

  const handleConfirmDecline = () => {
    if (!selected) return
    const trimmed = declineReason.trim()
    if (!trimmed) {
      setDeclineFieldError(labels.declineReasonRequired)
      return
    }
    setDeclineFieldError(null)
    setBusyAction("decline")
    startTransition(async () => {
      const result = await declineBookingRequest(selected.requestId, trimmed)
      setBusyAction(null)
      if (!result.success) {
        setActionError(resolveBookingError(result.error, labels.errorCodes))
        return
      }
      setDeclineOpen(false)
      setDeclineReason("")
      router.refresh()
    })
  }

  const handleToggleFreeFirst = (next: boolean) => {
    setFreeFirst(next)
    startTransition(async () => {
      const result = await updateCoachFreeFirstSession(next)
      if (!result.success) {
        setFreeFirst(!next)
        setActionError(resolveBookingError(result.error, labels.errorCodes))
        return
      }
      router.refresh()
    })
  }

  const tabClass = (id: CoachTab) =>
    `border-b-2 pb-3 text-sm font-semibold transition-colors ${
      tab === id
        ? "border-pine text-pine-dark"
        : "border-transparent text-ink-500 hover:text-ink-900"
    }`

  const renderSessionRow = (session: CalendarSession) => {
    const pay = paymentLabel(session.paymentStatus, labels)
    const title = resolveSessionTitle(
      session.title,
      session.sportType,
      labels.sportLabels
    )
    return (
      <li
        key={session.id}
        className="flex gap-3 rounded-[14px] border border-stone-300 bg-surface p-4"
      >
        <span
          className="w-1 shrink-0 rounded-full bg-pine"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-500">
            {formatSessionDayHeading(localDateKey(session.startsAt), locale)}
            {" · "}
            {formatSessionTimeRange(session.startsAt, session.endsAt, locale)}
          </p>
          <p className="mt-1 font-display text-[15px] font-semibold text-ink-900">
            {title}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {labels.withClient.replace("{name}", session.counterpartName)}
            {` · ${session.durationMinutes}${labels.minutesSuffix}`}
          </p>
          {pay ? (
            <div className="mt-2">
              <StatusPill
                variant={paymentPillVariant(session.paymentStatus)}
                label={pay}
              />
            </div>
          ) : null}
          {session.paymentStatus === "direct" ||
          (paymentCollection === "direct" &&
            (session.paymentStatus === "awaiting_payment" ||
              session.paymentStatus === "overdue" ||
              session.paymentStatus === "pending")) ? (
            <MarkPaidOfflineButton
              sessionId={session.id}
              label={labels.markPaidOffline}
              pendingLabel={labels.markPaidOfflinePending}
              errorLabels={labels.paymentActionErrors}
            />
          ) : null}
          {session.paymentStatus === "paid" ||
          session.paymentStatus === "paid_offline" ? (
            <Link
              href={receiptPath(session.id)}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-pine hover:underline"
            >
              {labels.viewReceipt}
            </Link>
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500">{labels.subtitle}</p>
        </div>
        <div className="max-w-xs rounded-[12px] border border-stone-300 bg-surface px-4 py-2">
          <Toggle
            checked={freeFirst}
            onChange={handleToggleFreeFirst}
            disabled={isPending}
            label={labels.freeFirstLabel}
          />
          <p className="mt-1 text-xs text-ink-500">{labels.freeFirstHint}</p>
        </div>
      </div>

      {acquisitionBlocked ? (
        <div
          className="mt-4 rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink-800"
          role="alert"
        >
          <p>{labels.acquisitionBlockedBanner}</p>
          <Link
            href={acquisitionPayHref || ROUTES.billing}
            className="mt-2 inline-flex min-h-11 items-center font-semibold text-pine hover:underline"
          >
            {labels.acquisitionBlockedCta}
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex gap-7 border-b border-stone-300">
        <button
          type="button"
          className={tabClass("pending")}
          onClick={() => setTab("pending")}
        >
          {labels.tabPending.replace(
            "{count}",
            String(pendingRequests.length)
          )}
        </button>
        <button
          type="button"
          className={tabClass("upcoming")}
          onClick={() => setTab("upcoming")}
        >
          {labels.tabUpcoming}
        </button>
        <button
          type="button"
          className={tabClass("past")}
          onClick={() => setTab("past")}
        >
          {labels.tabPast}
        </button>
      </div>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {actionError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {toast ? (
        <div
          className="mt-4 inline-flex items-center gap-2.5 rounded-[12px] bg-ink-900 px-4 py-3 text-[13.5px] font-medium text-surface"
          role="status"
        >
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-sage" aria-hidden />
          {toast}
        </div>
      ) : null}

      {tab === "pending" ? (
        pendingRequests.length === 0 ? (
          <div className="mt-8 max-w-md">
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title={labels.emptyPendingTitle}
              description={labels.emptyPendingBody}
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,420px)_1fr]">
            <ul className="flex flex-col gap-3">
              {pendingRequests.map((request) => {
                const selectedCard = request.requestId === selectedId
                const sport =
                  labels.sportLabels[request.sportType] ?? request.sportType
                return (
                  <li key={request.requestId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(request.requestId)}
                      aria-current={selectedCard ? "true" : undefined}
                      className={`flex w-full gap-3 rounded-[14px] border p-4 text-left transition-colors ${
                        selectedCard
                          ? "border-pine bg-pine-tint"
                          : "border-stone-300 bg-surface hover:border-pine"
                      }`}
                    >
                      <Avatar name={request.counterpartName} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-ink-900">
                            {request.counterpartName}
                          </span>
                          <StatusPill
                            variant={pendingPay.variant}
                            label={pendingPay.label}
                          />
                        </span>
                        <span className="mt-1 block text-[12.5px] text-ink-700">
                          {bookingSlotLabel(request, locale)}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {sport}
                        </span>
                        {request.clientNote ? (
                          <span className="mt-2 block rounded-[8px] bg-stone-150 px-2.5 py-2 text-xs italic text-ink-700">
                            “{request.clientNote}”
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex min-h-[320px] flex-col rounded-2xl border border-stone-300 bg-surface p-7">
              {selected ? (
                <>
                  <div className="mb-5 flex items-center gap-3.5 border-b border-stone-150 pb-5">
                    <Avatar name={selected.counterpartName} size="lg" />
                    <div>
                      <p className="font-display text-[17px] font-bold text-ink-900">
                        {selected.counterpartName}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        {formatRelativeRequestedAt(selected.createdAt, locale, {
                          justNow: labels.requestedJustNow,
                          minutesAgo: labels.requestedMinutesAgo,
                          hoursAgo: labels.requestedHoursAgo,
                          daysAgo: labels.requestedDaysAgo,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mb-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                        {labels.sessionTypeLabel}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink-900">
                        {labels.sportLabels[selected.sportType] ??
                          selected.sportType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                        {labels.proposedTimeLabel}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink-900">
                        {bookingSlotLabel(selected, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                        {labels.paymentStatusLabel}
                      </p>
                      <div className="mt-1">
                        <StatusPill
                          variant={pendingPay.variant}
                          label={pendingPay.label}
                        />
                      </div>
                    </div>
                  </div>
                  {selected.clientNote ? (
                    <p className="mb-5 rounded-[10px] bg-stone-150 px-3 py-2.5 text-sm italic text-ink-700">
                      “{selected.clientNote}”
                    </p>
                  ) : null}
                  <div className="mt-auto flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => {
                        setDeclineOpen(true)
                        setDeclineReason("")
                        setDeclineFieldError(null)
                      }}
                      className="min-h-[46px] flex-1"
                    >
                      {labels.declineCta}
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAccept(selected)}
                      className="min-h-[46px] flex-1"
                    >
                      {busyAction === "accept"
                        ? labels.acceptingCta
                        : labels.acceptCta}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-500">{labels.selectRequestHint}</p>
              )}
            </div>
          </div>
        )
      ) : null}

      {tab === "upcoming" ? (
        upcoming.length === 0 ? (
          <div className="mt-8 max-w-md">
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title={labels.emptyUpcoming}
              description={labels.emptyUpcomingBody}
              action={
                <Link
                  href={ROUTES.clients}
                  className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-ink-900 px-5 text-sm font-semibold text-cream hover:bg-ink-700"
                >
                  {labels.scheduleCta}
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-3">{upcoming.map(renderSessionRow)}</ul>
        )
      ) : null}

      {tab === "past" ? (
        past.length === 0 ? (
          <div className="mt-8 max-w-md">
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title={labels.emptyPast}
              description={labels.emptyDay}
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-3">{past.map(renderSessionRow)}</ul>
        )
      ) : null}

      {declineOpen && selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!isPending) {
              setDeclineOpen(false)
              setDeclineReason("")
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.declineModalTitle}
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {labels.declineModalTitle}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {labels.declineModalSubtitle}
            </p>
            <label className="mt-4 block text-sm font-semibold text-ink-700">
              {labels.declineReasonLabel}
              <textarea
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                placeholder={labels.declineReasonPlaceholder}
                rows={3}
                className="mt-2 w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3.5 py-3 text-sm text-ink-900"
              />
            </label>
            {declineFieldError ? (
              <p className="mt-2 text-sm text-danger" role="alert">
                {declineFieldError}
              </p>
            ) : null}
            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  setDeclineOpen(false)
                  setDeclineReason("")
                }}
                className="flex-1"
                aria-label={labels.closeAria}
              >
                {labels.cancelCta}
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDecline}
                className="flex-1"
              >
                {busyAction === "decline"
                  ? labels.decliningCta
                  : labels.declineConfirmCta}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
