"use client"

import { useEffect, useId, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Avatar, Button, EmptyState, StatusPill } from "@omnifit/ui"
import { createCoachingBookingRequest } from "./actions"
import {
  BOOKING_DURATION_OPTIONS,
  buildBookingStartsAt,
} from "./build-booking-starts-at"
import {
  bookingSlotLabel,
  resolveBookingError,
  type ClientBookingLabels,
} from "./labels"
import type { ClientCoachOption } from "./queries"
import type { BookingRequestSummary } from "./types"
import type { CalendarSession } from "@/features/app-calendar/types"
import {
  buildCalendarWeekSnapshot,
  getWeekStartMonday,
} from "@/features/app-calendar/week"
import {
  formatSessionDayHeading,
  formatSessionTimeRange,
  localDateKey,
  resolveSessionTitle,
} from "./calendar-format"
import { SPORT_TYPES } from "@/features/log-training/types"
import { ROUTES } from "@/lib/routes"
import { SessionPayLink } from "@/features/payments/SessionPayLink"

type ClientCalendarViewProps = {
  locale: string
  coaches: ClientCoachOption[]
  requests: BookingRequestSummary[]
  sessions: CalendarSession[]
  hasPhone: boolean
  loadFailed: boolean
  labels: ClientBookingLabels
  rangeStartIso: string
  rangeEndIso: string
}

type CalView = "week" | "month"

export const ClientCalendarView = ({
  locale,
  coaches,
  requests,
  sessions,
  hasPhone,
  loadFailed,
  labels,
  rangeStartIso,
  rangeEndIso,
}: ClientCalendarViewProps) => {
  const router = useRouter()
  const [calView, setCalView] = useState<CalView>("month")
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => localDateKey(new Date()))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const titleId = useId()
  const coachFieldId = useId()
  const dateId = useId()
  const timeId = useId()
  const durationId = useId()
  const noteId = useId()

  const [coachId, setCoachId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [durationMinutes, setDurationMinutes] = useState<number>(
    BOOKING_DURATION_OPTIONS[2]
  )
  const [sportType, setSportType] = useState<string>(SPORT_TYPES[0])
  const [note, setNote] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    coach?: string
    date?: string
    time?: string
  }>({})

  const todayKey = localDateKey(new Date())
  const snapshot = useMemo(
    () => buildCalendarWeekSnapshot(sessions, locale, weekAnchor),
    [sessions, locale, weekAnchor]
  )

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(weekAnchor),
    [locale, weekAnchor]
  )

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => localDateKey(s.startsAt) === selectedDay)
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        ),
    [sessions, selectedDay]
  )

  const upcoming = useMemo(() => {
    const floor = selectedDay > todayKey ? selectedDay : todayKey
    return sessions
      .filter((s) => localDateKey(s.startsAt) > floor)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
      .slice(0, 4)
  }, [sessions, selectedDay, todayKey])

  const sessionDots = useMemo(() => {
    const keys = new Set(sessions.map((s) => localDateKey(s.startsAt)))
    return keys
  }, [sessions])

  const monthCells = useMemo(() => {
    const start = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), 1)
    const end = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth() + 1, 0)
    const lead = (start.getDay() + 6) % 7 // Monday-first
    const cells: { key: string; inMonth: boolean; day: number }[] = []
    for (let i = 0; i < lead; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() - (lead - i))
      cells.push({
        key: localDateKey(d),
        inMonth: false,
        day: d.getDate(),
      })
    }
    for (let day = 1; day <= end.getDate(); day++) {
      const d = new Date(weekAnchor.getFullYear(), weekAnchor.getMonth(), day)
      cells.push({ key: localDateKey(d), inMonth: true, day })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]!
      const d = new Date(last.key + "T12:00:00")
      d.setDate(d.getDate() + 1)
      cells.push({
        key: localDateKey(d),
        inMonth: false,
        day: d.getDate(),
      })
    }
    return cells
  }, [weekAnchor])

  useEffect(() => {
    if (!dialogOpen) return
    if (coaches.length === 1) setCoachId(coaches[0]!.coachId)
  }, [dialogOpen, coaches])

  useEffect(() => {
    if (!dialogOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        setDialogOpen(false)
        setSubmitError(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dialogOpen, isPending])

  const canShift = (delta: number) => {
    const next = new Date(weekAnchor)
    if (calView === "month") {
      next.setMonth(next.getMonth() + delta)
    } else {
      next.setDate(next.getDate() + delta * 7)
    }
    const weekStart = getWeekStartMonday(next).getTime()
    const weekEnd = weekStart + 6 * 24 * 60 * 60 * 1000
    return (
      weekEnd >= new Date(rangeStartIso).getTime() &&
      weekStart <= new Date(rangeEndIso).getTime()
    )
  }

  const shift = (delta: number) => {
    if (!canShift(delta)) return
    setWeekAnchor((prev) => {
      const next = new Date(prev)
      if (calView === "month") next.setMonth(next.getMonth() + delta)
      else next.setDate(next.getDate() + delta * 7)
      return next
    })
  }

  const handleSetCalView = (next: CalView) => {
    setCalView(next)
    if (next === "week") {
      const [y, m, d] = selectedDay.split("-").map(Number)
      setWeekAnchor(new Date(y!, (m ?? 1) - 1, d ?? 1))
    }
  }

  const handleOpenRequest = () => {
    setSubmitError(null)
    setSuccessMessage(null)
    setFieldErrors({})
    setDate(selectedDay)
    if (coaches.length === 1) setCoachId(coaches[0]!.coachId)
    setDialogOpen(true)
  }

  const handleCloseRequest = () => {
    if (isPending) return
    setDialogOpen(false)
    setSubmitError(null)
  }

  const handleSubmit = () => {
    const nextErrors: typeof fieldErrors = {}
    if (!coachId.trim()) nextErrors.coach = labels.coachRequired
    if (!date.trim()) nextErrors.date = labels.dateRequired
    if (!time.trim()) nextErrors.time = labels.timeRequired
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    const startsAt = buildBookingStartsAt(date, time, timeZone)
    if (!startsAt) {
      setFieldErrors({ time: labels.timeRequired })
      return
    }

    setFieldErrors({})
    setSubmitError(null)
    startTransition(async () => {
      const result = await createCoachingBookingRequest({
        coachId,
        startsAt,
        durationMinutes,
        sportType,
        clientNote: note.trim() || undefined,
      })
      if (!result.success) {
        setSubmitError(resolveBookingError(result.error, labels.errorCodes))
        return
      }
      setDialogOpen(false)
      setSuccessMessage(labels.requestSuccess)
      setNote("")
      router.refresh()
    })
  }

  const statusVariant = (status: string) => {
    if (status === "pending") return "pending" as const
    if (status === "accepted") return "active" as const
    if (status === "declined") return "danger" as const
    return "inactive" as const
  }

  const statusLabel = (status: string) => {
    if (status === "pending") return labels.pendingStatus
    if (status === "accepted") return labels.acceptedStatus
    if (status === "declined") return labels.declinedStatus
    return status
  }

  const weekdayLabels = snapshot.days.map((d) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(d.dateKey + "T12:00:00")
    )
  )

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">{monthLabel}</p>
          <p className="mt-1 text-[13.5px] text-ink-500">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex rounded-[9px] bg-stone-150 p-0.5"
            role="group"
            aria-label={labels.title}
          >
            <button
              type="button"
              onClick={() => handleSetCalView("week")}
              className={`rounded-[7px] px-4 py-1.5 text-[12.5px] font-semibold ${
                calView === "week"
                  ? "bg-surface text-ink-900 shadow-sm"
                  : "text-ink-700"
              }`}
            >
              {labels.viewWeek}
            </button>
            <button
              type="button"
              onClick={() => handleSetCalView("month")}
              className={`rounded-[7px] px-4 py-1.5 text-[12.5px] font-semibold ${
                calView === "month"
                  ? "bg-surface text-ink-900 shadow-sm"
                  : "text-ink-700"
              }`}
            >
              {labels.viewMonth}
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleOpenRequest}
            disabled={!hasPhone || coaches.length === 0}
            className="border-0 bg-ink-900 text-cream hover:bg-ink-700 disabled:opacity-50"
          >
            {labels.requestCta}
          </Button>
        </div>
      </div>

      {!hasPhone ? (
        <div
          className="mt-4 rounded-[12px] border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-ink-800"
          role="status"
        >
          <p>{labels.phoneRequiredBanner}</p>
          <Link
            href={ROUTES.clientSettings}
            className="mt-2 inline-flex min-h-11 items-center font-semibold text-plum-dark underline"
          >
            {labels.phoneRequiredCta}
          </Link>
        </div>
      ) : null}

      {coaches.length === 0 ? (
        <div className="mt-4 max-w-md">
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title={labels.noCoachesTitle}
            description={labels.noCoachesDescription}
          />
        </div>
      ) : null}

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {successMessage ? (
        <div
          className="mt-4 inline-flex rounded-[12px] bg-ink-900 px-4 py-3 text-[13.5px] font-medium text-surface"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-stone-300 bg-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={!canShift(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-stone-300 text-ink-700 hover:border-pine disabled:opacity-40"
              aria-label={labels.weekPrev}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-ink-900">
              {calView === "week" ? snapshot.weekLabel : monthLabel}
            </p>
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={!canShift(1)}
              className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-stone-300 text-ink-700 hover:border-pine disabled:opacity-40"
              aria-label={labels.weekNext}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {calView === "week" ? (
            <div className="grid grid-cols-7 gap-2">
              {snapshot.days.map((day, index) => {
                const isToday = day.dateKey === todayKey
                const isSelected = day.dateKey === selectedDay
                const hasDot = sessionDots.has(day.dateKey)
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => setSelectedDay(day.dateKey)}
                    className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                      isSelected || isToday
                        ? "bg-ink-900 text-cream"
                        : "text-ink-900 hover:bg-stone-150"
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase text-inherit opacity-70">
                      {weekdayLabels[index]}
                    </span>
                    <span className="font-display text-[15px] font-semibold">
                      {Number(day.dateKey.slice(-2))}
                    </span>
                    {hasDot ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected || isToday ? "bg-sage" : "bg-pine"
                        }`}
                        aria-hidden
                      />
                    ) : (
                      <span className="h-1.5 w-1.5" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1.5">
                {weekdayLabels.map((w) => (
                  <span
                    key={w}
                    className="text-center text-[11px] font-bold uppercase text-ink-500"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {monthCells.map((cell) => {
                  const isToday = cell.key === todayKey
                  const isSelected = cell.key === selectedDay
                  const hasDot = sessionDots.has(cell.key)
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDay(cell.key)}
                      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl ${
                        isSelected || isToday
                          ? "bg-ink-900 text-cream"
                          : cell.inMonth
                            ? "text-ink-900 hover:bg-stone-150"
                            : "text-stone-300"
                      }`}
                    >
                      <span className="text-[13px] font-semibold">
                        {cell.day}
                      </span>
                      {hasDot ? (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected || isToday ? "bg-sage" : "bg-pine"
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <aside className="flex flex-col gap-3.5">
          <h2 className="font-display text-[15px] font-semibold text-ink-900">
            {formatSessionDayHeading(selectedDay, locale)}
          </h2>

          {daySessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-surface px-4 py-6 text-center text-[12.5px] text-ink-500">
              {labels.emptyDay}
            </div>
          ) : (
            <>
              {daySessions.map((session, index) => {
                const title = resolveSessionTitle(
                  session.title,
                  session.sportType,
                  labels.sportLabels
                )
                const featured = index === 0
                return (
                  <div
                    key={session.id}
                    className={`rounded-2xl border p-[18px] ${
                      featured
                        ? "border-pine bg-pine text-cream"
                        : "border-stone-300 bg-surface"
                    }`}
                  >
                    <p
                      className={`text-[12.5px] font-semibold ${
                        featured ? "text-[#C9DFCE]" : "text-ink-500"
                      }`}
                    >
                      {formatSessionTimeRange(
                        session.startsAt,
                        session.endsAt,
                        locale
                      )}
                    </p>
                    <p className="mt-1 font-display text-[15.5px] font-semibold">
                      {title}
                    </p>
                    <div
                      className={`mt-3 flex items-center gap-2 border-t pt-2.5 ${
                        featured
                          ? "border-white/20"
                          : "border-stone-150"
                      }`}
                    >
                      <Avatar name={session.counterpartName} size="sm" />
                      <span className="text-[12.5px] font-semibold">
                        {labels.withCoach.replace(
                          "{name}",
                          session.counterpartName
                        )}
                      </span>
                    </div>
                    {session.paymentStatus === "awaiting_payment" &&
                    labels.checkoutEnabled ? (
                      <SessionPayLink
                        sessionId={session.id}
                        label={labels.payCta}
                        featured={featured}
                      />
                    ) : session.paymentStatus === "awaiting_payment" ? (
                      <p
                        className={`mt-3 text-[12px] font-semibold ${
                          featured ? "text-[#C9DFCE]" : "text-danger"
                        }`}
                      >
                        {labels.paymentAwaiting}
                      </p>
                    ) : null}
                  </div>
                )
              })}
              {daySessions.length === 1 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-surface px-4 py-4 text-center text-[12.5px] text-ink-500">
                  {labels.emptyDayHint}
                </div>
              ) : null}
            </>
          )}

          {upcoming.length > 0 ? (
            <>
              <h3 className="mt-2 font-display text-sm font-semibold text-ink-900">
                {labels.upcomingTitle}
              </h3>
              {upcoming.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-stone-300 bg-surface px-4 py-3.5"
                >
                  <p className="text-xs font-semibold text-ink-500">
                    {bookingSlotLabel(
                      {
                        requestId: session.id,
                        coachId: "",
                        clientId: "",
                        sportType: session.sportType ?? "",
                        startsAt: session.startsAt,
                        endsAt: session.endsAt,
                        durationMinutes: session.durationMinutes,
                        status: "accepted",
                        clientNote: null,
                        declineReason: null,
                        sessionId: session.id,
                        counterpartName: session.counterpartName,
                        createdAt: session.startsAt,
                      },
                      locale
                    )}
                  </p>
                  <p className="mt-0.5 text-[13.5px] font-semibold text-ink-900">
                    {resolveSessionTitle(
                      session.title,
                      session.sportType,
                      labels.sportLabels
                    )}
                  </p>
                  {session.paymentStatus === "awaiting_payment" &&
                  labels.checkoutEnabled ? (
                    <SessionPayLink
                      sessionId={session.id}
                      label={labels.payCta}
                    />
                  ) : session.paymentStatus === "awaiting_payment" ? (
                    <p className="mt-2 text-[12px] font-semibold text-danger">
                      {labels.paymentAwaiting}
                    </p>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}

          {requests.length > 0 ? (
            <>
              <h3 className="mt-2 font-display text-sm font-semibold text-ink-900">
                {labels.myRequestsTitle}
              </h3>
              {requests.slice(0, 5).map((request) => (
                <div
                  key={request.requestId}
                  className="rounded-2xl border border-stone-300 bg-surface px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {request.counterpartName}
                    </p>
                    <StatusPill
                      variant={statusVariant(request.status)}
                      label={statusLabel(request.status)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {bookingSlotLabel(request, locale)}
                  </p>
                  {request.status === "declined" && request.declineReason ? (
                    <p className="mt-1 text-sm text-ink-500">
                      {labels.declineReasonPrefix} {request.declineReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
        </aside>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={handleCloseRequest}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="font-display text-lg font-semibold text-ink-900"
                >
                  {labels.requestModalTitle}
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {labels.requestModalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRequest}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-ink-500 hover:bg-stone-150"
                aria-label={labels.closeAria}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {coaches.length > 1 ? (
                <label
                  htmlFor={coachFieldId}
                  className="text-sm font-semibold text-ink-700"
                >
                  {labels.coachLabel}
                  <select
                    id={coachFieldId}
                    value={coachId}
                    onChange={(event) => setCoachId(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                  >
                    <option value="">{labels.coachPlaceholder}</option>
                    {coaches.map((coach) => (
                      <option key={coach.coachId} value={coach.coachId}>
                        {coach.displayName}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.coach ? (
                    <span className="mt-1 block text-sm text-danger">
                      {fieldErrors.coach}
                    </span>
                  ) : null}
                </label>
              ) : coaches[0] ? (
                <div className="flex items-center gap-3 rounded-[14px] border border-stone-300 bg-surface px-4 py-3.5">
                  <Avatar name={coaches[0].displayName} size="md" />
                  <span className="text-sm font-semibold text-ink-900">
                    {coaches[0].displayName}
                  </span>
                </div>
              ) : null}

              <label htmlFor={dateId} className="text-sm font-semibold text-ink-700">
                {labels.dateLabel}
                <input
                  id={dateId}
                  type="date"
                  min={todayKey}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                />
                {fieldErrors.date ? (
                  <span className="mt-1 block text-sm text-danger">
                    {fieldErrors.date}
                  </span>
                ) : null}
              </label>

              <label htmlFor={timeId} className="text-sm font-semibold text-ink-700">
                {labels.timeLabel}
                <input
                  id={timeId}
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                />
                {fieldErrors.time ? (
                  <span className="mt-1 block text-sm text-danger">
                    {fieldErrors.time}
                  </span>
                ) : null}
              </label>

              <label
                htmlFor={durationId}
                className="text-sm font-semibold text-ink-700"
              >
                {labels.durationLabel}
                <select
                  id={durationId}
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                  className="mt-1.5 h-11 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                >
                  {BOOKING_DURATION_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins}
                      {labels.minutesSuffix}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-ink-700">
                  {labels.sportLabel}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SPORT_TYPES.map((sport) => {
                    const active = sportType === sport
                    return (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => setSportType(sport)}
                        className={`rounded-full border-[1.5px] px-4 py-2 text-[13px] font-semibold ${
                          active
                            ? "border-ink-900 bg-ink-900 text-cream"
                            : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                        }`}
                      >
                        {labels.sportLabels[sport] ?? sport}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <label htmlFor={noteId} className="text-sm font-semibold text-ink-700">
                {labels.noteLabel}
                <textarea
                  id={noteId}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={labels.notePlaceholder}
                  rows={2}
                  className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 py-2.5 text-sm"
                />
              </label>

              <p className="rounded-[12px] bg-stone-150 px-4 py-3 text-[12.5px] text-ink-700">
                {labels.confirmNote}
              </p>

              {submitError ? (
                <p className="text-sm text-danger" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleCloseRequest}
                  className="flex-1"
                >
                  {labels.cancelCta}
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  {isPending ? labels.submittingCta : labels.submitCta}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
