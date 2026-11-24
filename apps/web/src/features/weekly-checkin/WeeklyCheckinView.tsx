"use client"

import { useState, useTransition } from "react"
import { upsertWeeklyCheckin } from "./actions"
import type { WeeklyCheckinLabels } from "./labels"
import {
  CHECKIN_METRICS,
  emptyScores,
  isCheckinComplete,
  type CheckinMetric,
  type WeeklyCheckinPageData,
  type WeeklyCheckinScores,
} from "./types"

type WeeklyCheckinViewProps = {
  initialData: WeeklyCheckinPageData
  labels: WeeklyCheckinLabels
  loadFailed?: boolean
}

const formatWeekEnding = (isoDate: string) => {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  // Week start is Sunday; ending is that Sunday
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

export const WeeklyCheckinView = ({
  initialData,
  labels,
  loadFailed = false,
}: WeeklyCheckinViewProps) => {
  const [scores, setScores] = useState<WeeklyCheckinScores>(
    initialData.current
      ? { ...initialData.current.scores }
      : emptyScores()
  )
  const [notes, setNotes] = useState(initialData.current?.notes ?? "")
  const [submitted, setSubmitted] = useState(Boolean(initialData.current))
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()

  const complete = isCheckinComplete(scores)
  const weekText = (labels.weekEnding ?? labels.weekLabel).replace(
    "{date}",
    formatWeekEnding(initialData.weekStart)
  )

  const handleScore = (metric: CheckinMetric, value: number) => {
    setScores((current) => ({ ...current, [metric]: value }))
    setSubmitted(false)
  }

  const handleSubmit = () => {
    if (!complete) {
      setStatusError(labels.incompleteHint)
      return
    }

    startSave(async () => {
      const result = await upsertWeeklyCheckin({
        weekStart: initialData.weekStart,
        sleep: scores.sleep!,
        soreness: scores.soreness!,
        stress: scores.stress!,
        energy: scores.energy!,
        motivation: scores.motivation!,
        notes: notes.trim() || undefined,
      })
      if (!result.success) {
        setStatusError(result.error)
        return
      }
      setStatusError(null)
      setSubmitted(true)
    })
  }

  if (submitted && complete) {
    return (
      <div className="mx-auto max-w-[560px]">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">
          {weekText}
        </p>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-300 bg-surface px-6 py-8 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-tint text-pine-dark"
            aria-hidden
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <polyline
                points="5,13 10,18 19,7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="font-display text-lg font-semibold text-ink-900">
            {labels.successTitle}
          </h1>
          <p className="text-sm text-ink-500">{labels.successDesc}</p>
          <dl className="mt-2 w-full space-y-2 text-left">
            {CHECKIN_METRICS.map((metric) => (
              <div
                key={metric}
                className="flex items-center justify-between border-b border-stone-150 py-2 text-sm"
              >
                <dt className="text-ink-500">{labels.metrics[metric]}</dt>
                <dd className="font-semibold text-ink-900">
                  {labels.scoreOf
                    .replace("{score}", String(scores[metric]))
                    .replace("{max}", "5")}
                </dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 text-sm font-semibold text-pine-dark hover:underline"
          >
            {labels.editAgain}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[560px] pb-28">
      <h1 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
        {labels.headline ?? labels.title}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-500">{weekText}</p>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {statusError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {statusError}
        </p>
      ) : null}

      <form
        className="mt-8 space-y-7"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        {CHECKIN_METRICS.map((metric) => {
          const selected = scores[metric] ?? null
          return (
            <fieldset key={metric} className="m-0 border-0 p-0">
              <legend className="text-sm font-semibold text-ink-900">
                {labels.metrics[metric]}
              </legend>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                {labels.metricDesc[metric]}
              </p>
              <div
                className="mt-3 flex gap-2"
                role="radiogroup"
                aria-label={`${labels.metrics[metric]}, 1 to 5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selected === n}
                    onClick={() => handleScore(metric, n)}
                    className={`h-11 w-[52px] shrink-0 rounded-[10px] border-[1.5px] font-display text-[15px] font-semibold transition-colors ${
                      selected === n
                        ? "border-pine bg-pine text-cream"
                        : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-500">
                <span>{labels.scaleLow}</span>
                <span>{labels.scaleHigh}</span>
              </div>
            </fieldset>
          )
        })}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink-900">
            {labels.notesLabel}
          </span>
          <textarea
            value={notes}
            placeholder={labels.notesPlaceholder}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 py-2 text-sm"
          />
        </label>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-[15px] font-semibold text-ink-900">
          {labels.historyTitle}
        </h2>
        {initialData.history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">{labels.historyEmpty}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {initialData.history.map((row) => (
              <li
                key={row.id}
                className="rounded-[10px] border border-stone-150 bg-surface px-3 py-2 text-sm text-ink-700"
              >
                <span className="font-semibold">{row.weekStart}</span>
                <span className="text-ink-500">
                  {" · "}
                  {CHECKIN_METRICS.map(
                    (m) => `${labels.short[m]}${row.scores[m] ?? "–"}`
                  ).join(" ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-300 bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:left-[var(--of-sidebar-w)]">
        <div className="mx-auto max-w-[560px]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!complete || isSaving}
            title={complete ? undefined : labels.incompleteHint}
            className="h-12 w-full rounded-[10px] bg-ink-900 text-sm font-semibold text-cream hover:bg-ink-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-ink-500"
          >
            {isSaving ? labels.saving : labels.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
