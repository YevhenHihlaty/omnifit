"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import type { ClientProgressLabels } from "./labels"
import type {
  ClientProgressPageData,
  HistoryFeedItem,
  HistoryFilter,
  ProgressTab,
  WeightPoint,
} from "./types"

type ClientProgressViewProps = {
  initialData: ClientProgressPageData
  labels: ClientProgressLabels
  loadFailed?: boolean
}

const TABS: ProgressTab[] = ["goals", "progress", "history", "checkin"]
const FILTERS: HistoryFilter[] = [
  "all",
  "meal",
  "workout",
  "metrics",
  "checkin",
]

const historyTitle = (
  item: HistoryFeedItem,
  labels: ClientProgressLabels
): string => {
  if (item.kind === "workout") {
    return labels.historyCompletedWorkout.replace(
      "{sport}",
      labels.sports[item.titleKey] ?? item.titleKey
    )
  }
  if (item.kind === "meal") {
    return labels.historyLoggedMeal.replace(
      "{meal}",
      labels.meals[item.titleKey] ?? item.titleKey
    )
  }
  if (item.kind === "checkin") {
    return labels.historySubmittedCheckin
  }
  if (item.weightKg != null) {
    return labels.historyLoggedWeight
      .replace("{weight}", String(item.weightKg))
      .replace("{unit}", labels.kgUnit)
  }
  return labels.historyKinds.metrics
}

const dayKey = (iso: string) => iso.slice(0, 10)

const formatTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

const dayLabel = (
  key: string,
  labels: ClientProgressLabels
): string => {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const y = new Date(today)
  y.setDate(y.getDate() - 1)
  const yesterdayKey = y.toISOString().slice(0, 10)
  if (key === todayKey) return labels.historyToday
  if (key === yesterdayKey) return labels.historyYesterday
  return key
}

const WeightSparkline = ({ points }: { points: WeightPoint[] }) => {
  if (points.length < 2) return null
  const values = points.map((p) => p.weightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 320
  const h = 70
  const pad = 8
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - ((p.weightKg - min) / span) * (h - pad * 2)
    return `${x},${y}`
  })
  const last = coords[coords.length - 1]?.split(",") ?? ["0", "0"]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-[60px] w-full" aria-hidden>
      <line
        x1="0"
        y1="55"
        x2={w}
        y2="55"
        stroke="var(--of-stone-150)"
        strokeWidth="1"
      />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--of-pine)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--of-pine)" />
    </svg>
  )
}

export const ClientProgressView = ({
  initialData,
  labels,
  loadFailed = false,
}: ClientProgressViewProps) => {
  const [tab, setTab] = useState<ProgressTab>("goals")
  const [filter, setFilter] = useState<HistoryFilter>("all")

  const filteredHistory = useMemo(() => {
    if (filter === "all") return initialData.history
    return initialData.history.filter((item) => item.kind === filter)
  }, [filter, initialData.history])

  const groupedHistory = useMemo(() => {
    const groups: { key: string; items: HistoryFeedItem[] }[] = []
    for (const item of filteredHistory) {
      const key = dayKey(item.loggedAt)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.items.push(item)
      } else {
        groups.push({ key, items: [item] })
      }
    }
    return groups
  }, [filteredHistory])

  const m = initialData.latestMeasurements
  const measurementTiles = [
    { label: labels.waistLabel, value: m?.waistCm, unit: labels.cmUnit },
    { label: labels.chestLabel, value: m?.chestCm, unit: labels.cmUnit },
    { label: labels.armLabel, value: m?.armCm, unit: labels.cmUnit },
    { label: labels.weightLabel, value: m?.weightKg, unit: labels.kgUnit },
  ]

  return (
    <div className="mx-auto max-w-[960px]">
      <h1 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
        {labels.title}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-500">{labels.subtitle}</p>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      <div
        className="mt-6 flex gap-1 border-b border-stone-300"
        role="tablist"
        aria-label={labels.title}
      >
        {TABS.map((id) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`progress-tab-${id}`}
              aria-selected={active}
              aria-controls={`progress-panel-${id}`}
              onClick={() => setTab(id)}
              className={`-mb-px flex-1 border-b-2 px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:flex-none sm:px-4 ${
                active
                  ? "border-pine text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-700"
              }`}
            >
              {labels.tabs[id]}
            </button>
          )
        })}
      </div>

      <div
        className="mt-6"
        role="tabpanel"
        id={`progress-panel-${tab}`}
        aria-labelledby={`progress-tab-${tab}`}
      >
        {tab === "goals" ? (
          <section className="rounded-2xl border border-stone-300 bg-surface p-5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-pine-tint text-pine-dark"
                aria-hidden
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="8.5" />
                  <circle cx="12" cy="12" r="4.5" />
                  <circle cx="12" cy="12" r="1" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-ink-500">{labels.primaryObjective}</p>
                {initialData.goal ? (
                  <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink-900">
                    {initialData.goal}
                  </h2>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">{labels.goalsEmpty}</p>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-500">{labels.goalsReadonlyHint}</p>
            <Link
              href={ROUTES.clientSettings}
              className="mt-2 inline-block text-sm font-semibold text-pine-dark hover:underline"
            >
              {labels.settingsLink}
            </Link>
          </section>
        ) : null}

        {tab === "progress" ? (
          <div className="space-y-4">
            {!initialData.thisWeekCheckin ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-butter px-3.5 py-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-ink-900"
                  aria-hidden
                >
                  <path d="M12,3 l9,16 H3 Z" />
                  <line x1="12" y1="10" x2="12" y2="14" />
                  <circle cx="12" cy="17" r="0.6" fill="currentColor" />
                </svg>
                <p className="flex-1 text-[12.5px] font-semibold text-ink-900">
                  {labels.checkinDue}
                </p>
                <Link
                  href={ROUTES.clientCheckin}
                  className="text-sm font-semibold text-pine-dark hover:underline"
                >
                  {labels.checkinCta}
                </Link>
              </div>
            ) : null}

            <section className="rounded-2xl border border-stone-300 bg-surface p-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="font-display text-[13.5px] font-semibold text-ink-900">
                  {labels.progressTitle}
                </h2>
                <span className="text-[11px] text-ink-500">
                  {labels.weightLast90}
                </span>
              </div>
              {initialData.weightTrend.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">
                  {labels.weightTrendEmpty}
                </p>
              ) : (
                <>
                  <WeightSparkline points={initialData.weightTrend} />
                  <p className="mt-1 text-right text-sm font-semibold text-ink-900">
                    {initialData.weightTrend[initialData.weightTrend.length - 1]
                      ?.weightKg}{" "}
                    {labels.kgUnit}
                  </p>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-stone-300 bg-surface p-4">
              <h2 className="mb-2 font-display text-[13.5px] font-semibold text-ink-900">
                {labels.measurementsTitle}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {measurementTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-[9px] bg-stone-150 px-2 py-2 text-center"
                  >
                    <div className="text-[10px] text-ink-500">{tile.label}</div>
                    <div className="font-display text-sm font-bold text-ink-900">
                      {tile.value != null
                        ? `${tile.value}${tile.unit}`
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-300 bg-surface p-4">
              <h2 className="mb-2 font-display text-[13.5px] font-semibold text-ink-900">
                {labels.photoTimelineTitle}
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {initialData.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="h-16 w-[52px] shrink-0 overflow-hidden rounded-[9px] border border-stone-300 bg-stone-150"
                  >
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={photo.pose}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                ))}
                <Link
                  href={ROUTES.clientLogBody}
                  aria-label={labels.addPhoto}
                  className="flex h-16 w-[52px] shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-dashed border-stone-300 text-ink-500 hover:border-pine hover:text-pine-dark"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </Link>
              </div>
              {initialData.photos.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">{labels.photosEmpty}</p>
              ) : null}
            </section>
          </div>
        ) : null}

        {tab === "history" ? (
          <section>
            <div
              className="mb-4 flex gap-2 overflow-x-auto"
              role="tablist"
              aria-label={labels.historyTitle}
            >
              {FILTERS.map((id) => {
                const active = filter === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(id)}
                    className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                      active
                        ? "border-pine bg-pine text-cream"
                        : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                    }`}
                  >
                    {labels.historyFilters[id]}
                  </button>
                )
              })}
            </div>

            {groupedHistory.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.historyEmpty}</p>
            ) : (
              <div className="rounded-2xl border border-stone-300 bg-surface px-4 py-2">
                {groupedHistory.map((group) => (
                  <div key={group.key}>
                    <p className="mb-1.5 mt-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {dayLabel(group.key, labels)}
                    </p>
                    <ul>
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 border-b border-stone-150 py-2 last:border-0"
                        >
                          <span
                            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[10px] font-bold uppercase ${
                              item.kind === "checkin"
                                ? "bg-butter text-ink-900"
                                : "bg-pine-tint text-pine-dark"
                            }`}
                            aria-hidden
                          >
                            {item.kind === "meal"
                              ? "M"
                              : item.kind === "workout"
                                ? "W"
                                : item.kind === "metrics"
                                  ? "B"
                                  : "C"}
                          </span>
                          <span className="min-w-0 flex-1 text-[13px] font-medium text-ink-900">
                            {historyTitle(item, labels)}
                          </span>
                          <span className="shrink-0 text-[11.5px] text-ink-500">
                            {formatTime(item.loggedAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "checkin" ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-stone-300 bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {labels.checkinTitle}
              </h2>
              {initialData.thisWeekCheckin ? (
                <p className="mt-3 text-sm text-pine-dark">{labels.checkinDone}</p>
              ) : (
                <p className="mt-3 text-sm text-ink-500">{labels.checkinDue}</p>
              )}
              <Link
                href={ROUTES.clientCheckin}
                className="mt-4 inline-flex rounded-[10px] bg-pine px-4 py-2.5 text-sm font-semibold text-surface hover:bg-pine-dark"
              >
                {labels.checkinCta}
              </Link>
            </section>

            <section className="rounded-2xl border border-stone-300 bg-surface p-5">
              <h2 className="font-display text-[15px] font-semibold text-ink-900">
                {labels.checkinPastTitle}
              </h2>
              {initialData.pastCheckins.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">
                  {labels.checkinPastEmpty}
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-ink-700">
                  {initialData.pastCheckins.map((row) => (
                    <li key={row.weekStart}>
                      <span className="font-semibold">{row.weekStart}</span>
                      <span className="text-ink-500">
                        {" · "}
                        {labels.checkinShort.sleep}
                        {row.sleep ?? "–"} {labels.checkinShort.soreness}
                        {row.soreness ?? "–"} {labels.checkinShort.stress}
                        {row.stress ?? "–"} {labels.checkinShort.energy}
                        {row.energy ?? "–"} {labels.checkinShort.motivation}
                        {row.motivation ?? "–"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
