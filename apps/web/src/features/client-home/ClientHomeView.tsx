"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Avatar } from "@omnifit/ui"
import { ROUTES } from "@/lib/routes"
import { browserTimeZone } from "./calendar-date"
import { toggleHabitCompletion } from "./toggle-habit-completion"
import {
  habitDoneCount,
  ringForFocus,
  selectFocusedCoach,
  shouldShowCoachesStrip,
} from "./mappers"
import type { ClientHomeLabels } from "./labels"
import type { ClientHomeHabit, ClientHomeSnapshot } from "./types"

type ClientHomeViewProps = {
  snapshot: ClientHomeSnapshot
  labels: ClientHomeLabels
  displayName: string
}

const greetingForHour = (hour: number, labels: ClientHomeLabels): string => {
  if (hour < 12) return labels.greetingMorning
  if (hour < 18) return labels.greetingAfternoon
  return labels.greetingEvening
}

const formatSessionWhen = (iso: string): string => {
  try {
    const d = new Date(iso)
    const today = new Date()
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
    if (sameDay) return `Today · ${time}`
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${time}`
  } catch {
    return iso
  }
}

export const ClientHomeView = ({
  snapshot,
  labels,
  displayName,
}: ClientHomeViewProps) => {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName
  const hour = new Date().getHours()
  const greeting = greetingForHour(hour, labels).replace("{name}", firstName)
  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const defaultFocus = selectFocusedCoach(snapshot.coaches, null)?.coachId ?? null
  const [focusedCoachId, setFocusedCoachId] = useState<string | null>(defaultFocus)
  const [habits, setHabits] = useState(snapshot.habits)
  const [habitError, setHabitError] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Keep local habits/focus in sync when RSC refresh replaces snapshot
  useEffect(() => {
    setHabits(snapshot.habits)
    const next = selectFocusedCoach(snapshot.coaches, focusedCoachId)?.coachId ?? null
    setFocusedCoachId(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync on snapshot identity change
  }, [snapshot])

  const focused = selectFocusedCoach(snapshot.coaches, focusedCoachId)
  const ring = ringForFocus(
    { coaches: snapshot.coaches, consumedKcal: snapshot.consumedKcal },
    focusedCoachId
  )
  // Chips switch calorie hero only — always show every coach's habits
  const { done, total } = habitDoneCount(habits)
  const showStrip = shouldShowCoachesStrip(snapshot.coaches.length)

  const handleToggle = (habit: ClientHomeHabit) => {
    setHabitError(false)
    startTransition(async () => {
      const result = await toggleHabitCompletion(habit.id, browserTimeZone())
      if (!result.success) {
        setHabitError(true)
        return
      }
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id
            ? { ...h, done: result.done, currentValue: result.currentValue }
            : h
        )
      )
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
          {greeting}
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">{dateLine}</p>
      </div>

      {snapshot.coaches.length === 0 ? (
        <div className="rounded-2xl border border-stone-300 bg-surface p-6">
          <p className="font-display text-base font-semibold text-ink-900">
            {labels.zeroCoachesTitle}
          </p>
          <p className="mt-1 text-sm text-ink-500">{labels.zeroCoachesBody}</p>
          <Link
            href={ROUTES.clientMyCoaches}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-plum-dark hover:underline"
          >
            {labels.zeroCoachesCta} →
          </Link>
        </div>
      ) : null}

      {snapshot.coaches.length > 1 ? (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label={labels.targetChipAria}
        >
          {snapshot.coaches.map((c) => {
            const active = c.coachId === focusedCoachId
            return (
              <button
                key={c.coachId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFocusedCoachId(c.coachId)}
                className={[
                  "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-ink-900 text-cream"
                    : "border border-stone-300 bg-surface text-ink-700 hover:bg-stone-100",
                ].join(" ")}
              >
                {c.displayName}
                {c.targetKcal != null ? (
                  <span className="ml-1.5 opacity-70">
                    {c.targetKcal.toLocaleString()}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-6 rounded-3xl bg-ink-900 px-7 py-[26px] text-cream shadow-[0_20px_40px_-22px_rgba(20,24,28,0.45)] sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#9CA69C]">
            {labels.caloriesToday}
            {focused && snapshot.coaches.length > 1 ? (
              <span className="ml-1 font-medium">· {focused.displayName}</span>
            ) : null}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-[34px] font-bold leading-none">
              {ring.consumedKcal.toLocaleString()}
            </span>
            <span className="text-[15px] text-[#9CA69C]">
              {ring.targetKcal != null
                ? `/ ${ring.targetKcal.toLocaleString()} ${labels.kcalUnit}`
                : `· ${labels.noTarget}`}
            </span>
          </div>
          <div className="mt-3 h-2 w-[220px] max-w-full overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-[#8FB89B] transition-[width] duration-300"
              style={{ width: `${Math.round(ring.progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-1 gap-7">
          <MacroStat label={labels.protein} value={snapshot.consumedProteinG} />
          <MacroStat label={labels.carbs} value={snapshot.consumedCarbsG} />
          <MacroStat label={labels.fat} value={snapshot.consumedFatG} />
        </div>
      </div>

      <div className="flex flex-col gap-3.5 sm:flex-row">
        <QuickAction
          label={labels.logMeal}
          bg="bg-peach-tint"
          iconStroke="var(--of-peach-dark)"
          icon="meal"
          href={ROUTES.clientLogMeal}
        />
        <QuickAction
          label={labels.logTraining}
          bg="bg-sage-tint"
          iconStroke="var(--of-pine-dark)"
          icon="training"
          href={ROUTES.clientLogTraining}
        />
        <QuickAction
          label={labels.bodyMetrics}
          bg="bg-lilac-tint"
          iconStroke="var(--of-plum-dark)"
          icon="metrics"
          href={ROUTES.clientLogBody}
        />
      </div>

      <section className="rounded-[22px] border border-stone-150 bg-surface p-5 shadow-[0_1px_2px_rgba(20,24,28,0.04),0_12px_28px_-18px_rgba(20,24,28,0.16)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[15px] font-semibold text-ink-900">
              {labels.weightTrendTitle}
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-500">{labels.weightTrendCaption}</p>
          </div>
          <Link
            href={ROUTES.clientLogBody}
            className="text-[12.5px] font-semibold text-pine-dark hover:underline"
          >
            {labels.bodyMetrics}
          </Link>
        </div>
        <WeightTrendChart />
      </section>

      {snapshot.checkinDue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-butter px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">
            {labels.checkinDue}
          </p>
          <Link
            href={ROUTES.clientCheckin}
            className="rounded-[10px] bg-ink-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-ink-700"
          >
            {labels.checkinCta}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[22px] border border-stone-150 bg-surface p-5 shadow-[0_1px_2px_rgba(20,24,28,0.04),0_12px_28px_-18px_rgba(20,24,28,0.16)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-900">
              {labels.habitsTitle}
            </h2>
            {total > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-tint px-3 py-1 text-xs font-bold text-pine-dark">
                {labels.habitsDone
                  .replace("{done}", String(done))
                  .replace("{total}", String(total))}
              </span>
            ) : null}
          </div>
          {habitError ? (
            <p className="mb-3 text-sm text-danger" role="alert">
              {labels.habitsToggleError}
            </p>
          ) : null}
          {habits.length === 0 ? (
            <p className="text-sm text-ink-500">
              {snapshot.coaches.length === 0
                ? labels.habitsEmptyNoCoach
                : labels.habitsEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {habits.map((habit) => (
                <li key={habit.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    aria-pressed={habit.done}
                    onClick={() => handleToggle(habit)}
                    className={[
                      "flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors",
                      habit.done ? "bg-pine-tint" : "bg-stone-150",
                    ].join(" ")}
                  >
                    <span
                      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-white/65"
                      aria-hidden
                    >
                      <HabitGlyph unit={habit.unit} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block text-sm font-medium",
                          habit.done ? "text-ink-900" : "text-ink-700",
                        ].join(" ")}
                      >
                        {habit.title}
                      </span>
                      {snapshot.coaches.length > 1 ? (
                        <span className="text-[11px] text-ink-500">
                          {habit.coachName}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={[
                        "flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-[9px] border-[1.5px] text-[11px] font-bold text-white",
                        habit.done
                          ? "border-pine bg-pine shadow-[0_3px_8px_-2px_rgba(63,107,79,0.5)]"
                          : "border-stone-300 bg-transparent",
                      ].join(" ")}
                      aria-hidden
                    >
                      {habit.done ? "✓" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-[18px]">
          {showStrip ? (
            <section className="rounded-[22px] border border-stone-150 bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[15px] font-semibold text-ink-900">
                  {labels.coachesStripTitle}
                </h2>
                <Link
                  href={ROUTES.clientMyCoaches}
                  className="text-xs font-semibold text-plum-dark hover:underline"
                >
                  {labels.coachesStripManage}
                </Link>
              </div>
              <ul className="flex flex-col gap-2.5">
                {snapshot.coaches.map((c) => (
                  <li key={c.coachId} className="flex items-center gap-3">
                    <Avatar name={c.displayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {c.displayName}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {c.targetKcal != null
                          ? `${c.targetKcal.toLocaleString()} ${labels.kcalUnit}`
                          : labels.noTarget}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-[22px] bg-pine-tint p-5 shadow-[0_12px_26px_-18px_rgba(44,79,57,0.5)]">
            <h2 className="font-display text-[14.5px] font-semibold text-pine-dark">
              {labels.upcomingTitle}
            </h2>
            {snapshot.upcomingSession ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {formatSessionWhen(snapshot.upcomingSession.startsAt)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-pine-dark">
                    {snapshot.upcomingSession.title}
                    {snapshot.upcomingSession.durationMinutes
                      ? ` · ${snapshot.upcomingSession.durationMinutes} ${labels.minutesSuffix}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 border-t border-pine-dark/15 pt-2">
                  <Avatar name={snapshot.upcomingSession.coachName} size="sm" />
                  <span className="text-[13px] font-semibold text-ink-900">
                    {labels.withCoach.replace(
                      "{name}",
                      snapshot.upcomingSession.coachName
                    )}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-pine-dark/80">{labels.upcomingNone}</p>
            )}
          </section>

          <section className="rounded-[22px] border border-stone-150 bg-surface p-5 shadow-[0_1px_2px_rgba(20,24,28,0.04),0_12px_28px_-18px_rgba(20,24,28,0.16)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[14.5px] font-semibold text-ink-900">
                {labels.messagesTitle}
              </h2>
              <Link
                href={ROUTES.messages}
                className="text-[12.5px] font-semibold text-pine-dark hover:underline"
              >
                {labels.messagesViewAll}
              </Link>
            </div>
            {snapshot.messagesPreview.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.messagesEmpty}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-stone-100">
                {snapshot.messagesPreview.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`${ROUTES.messages}/${encodeURIComponent(row.id)}`}
                      className="flex items-start gap-2.5 py-2.5 hover:bg-stone-50 -mx-1 px-1 rounded-[10px]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-tint text-[11px] font-bold text-pine-dark">
                        {row.senderName ? row.senderName.charAt(0).toUpperCase() : "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink-900 leading-tight">
                          {row.senderName || "—"}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-500">
                          {row.preview}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-500">
                        <MessageTime iso={row.at} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

const WeightTrendChart = () => (
  <svg
    viewBox="0 0 280 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full"
    aria-hidden
  >
    <defs>
      <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--of-pine)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="var(--of-pine)" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,52 L40,46 L80,50 L120,38 L160,34 L200,28 L240,22 L280,18"
      fill="none"
      stroke="var(--of-pine)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,52 L40,46 L80,50 L120,38 L160,34 L200,28 L240,22 L280,18 L280,72 L0,72 Z"
      fill="url(#wt-grad)"
    />
  </svg>
)

const MessageTime = ({ iso }: { iso: string }) => {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) {
      return <>{d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</>
    }
    if (diffDays === 1) return <>Yesterday</>
    if (diffDays < 7) {
      return <>{d.toLocaleDateString(undefined, { weekday: "short" })}</>
    }
    return <>{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>
  } catch {
    return null
  }
}

const MacroStat = ({
  label,
  value,
}: {
  label: string
  value: number | null | undefined
}) => (
  <div>
    <p className="text-xs font-semibold text-[#9CA69C]">{label}</p>
    <p className="mt-0.5 font-display text-[17px] font-semibold">
      {value != null ? `${Math.round(value)}g` : "—"}
    </p>
  </div>
)

const HabitGlyph = ({ unit }: { unit: string }) => {
  const stroke = "var(--of-pine-dark)"
  if (unit === "minutes") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="9" width="3" height="6" rx="1" stroke={stroke} strokeWidth="1.8" />
        <rect x="19" y="9" width="3" height="6" rx="1" stroke={stroke} strokeWidth="1.8" />
        <rect x="6" y="7" width="3" height="10" rx="1" stroke={stroke} strokeWidth="1.8" />
        <rect x="15" y="7" width="3" height="10" rx="1" stroke={stroke} strokeWidth="1.8" />
      </svg>
    )
  }
  if (unit === "liters") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12,3 C9,8 6,11.5 6,15 a6,6 0 0 0 12,0 c0,-3.5 -3,-7 -6,-12 Z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4,12 c0,-5 3,-8 8,-8 s8,3 8,8 -3,8 -8,8 -8,-3 -8,-8 Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

const QuickAction = ({
  label,
  bg,
  icon,
  iconStroke,
  disabled,
  title,
  href,
}: {
  label: string
  bg: string
  icon: "meal" | "training" | "metrics"
  iconStroke: string
  disabled?: boolean
  title?: string
  href?: string
}) => {
  const className = [
    "flex min-h-[72px] flex-1 items-center gap-3 rounded-[18px] px-4 text-left shadow-[0_10px_22px_-16px_rgba(20,24,28,0.35)]",
    bg,
    disabled ? "cursor-not-allowed opacity-70" : "hover:brightness-[0.98]",
  ].join(" ")

  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/70 shadow-sm">
        {icon === "meal" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4,12 c0,-5 3,-8 8,-8 s8,3 8,8 -3,8 -8,8 -8,-3 -8,-8 Z"
              stroke={iconStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        {icon === "training" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="9" width="3" height="6" rx="1" stroke={iconStroke} strokeWidth="1.8" />
            <rect x="19" y="9" width="3" height="6" rx="1" stroke={iconStroke} strokeWidth="1.8" />
            <rect x="6" y="7" width="3" height="10" rx="1" stroke={iconStroke} strokeWidth="1.8" />
            <rect x="15" y="7" width="3" height="10" rx="1" stroke={iconStroke} strokeWidth="1.8" />
          </svg>
        ) : null}
        {icon === "metrics" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12,21 c-4.5,-3 -7,-6.2 -7,-9.5 A4.5,4.5 0 0 1 12,7.5 A4.5,4.5 0 0 1 19,11.5 c0,3.3 -2.5,6.5 -7,9.5 Z"
              stroke={iconStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="font-display text-[14.5px] font-semibold text-ink-900">
        {label}
      </span>
    </>
  )

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={title}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" disabled={disabled} title={title} className={className}>
      {content}
    </button>
  )
}
