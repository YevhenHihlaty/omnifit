"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { HistoryFilter, HistoryGroup, HistoryKind } from "./history-mappers"
import type { HistoryRangeDays } from "./history-analytics-queries"

export type ClientHistoryLabels = {
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

type ClientHistoryViewProps = {
  groups: HistoryGroup[]
  labels: ClientHistoryLabels
  loadFailed?: boolean
  rangeDays: HistoryRangeDays
  rangeHref: (days: HistoryRangeDays) => string
}

const FILTERS: HistoryFilter[] = ["all", "food", "training", "metrics"]
const RANGES: HistoryRangeDays[] = [7, 30, 90]

const KindIcon = ({ kind }: { kind: HistoryKind }) => {
  if (kind === "food") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-pine-tint"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--of-pine-dark)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4,12 c0,-5 3,-8 8,-8 s8,3 8,8 -3,8 -8,8 -8,-3 -8,-8 Z" />
        </svg>
      </span>
    )
  }
  if (kind === "training") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-pine-tint"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--of-pine-dark)" strokeWidth="1.8" strokeLinecap="round">
          <rect x="2" y="9" width="3" height="6" rx="1" />
          <rect x="19" y="9" width="3" height="6" rx="1" />
          <rect x="6" y="7" width="3" height="10" rx="1" />
          <rect x="15" y="7" width="3" height="10" rx="1" />
        </svg>
      </span>
    )
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-peach-tint"
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A15A2E" strokeWidth="1.8">
        <path d="M12,3 C9,8 6,11.5 6,15 a6,6 0 0 0 12,0 c0,-3.5 -3,-7 -6,-12 Z" />
      </svg>
    </span>
  )
}

export const ClientHistoryView = ({
  groups,
  labels,
  loadFailed = false,
  rangeDays,
  rangeHref,
}: ClientHistoryViewProps) => {
  const [filter, setFilter] = useState<HistoryFilter>("all")

  const visible = useMemo(() => {
    if (filter === "all") return groups
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => e.kind === filter),
      }))
      .filter((g) => g.entries.length > 0)
  }, [filter, groups])

  const filterLabel = (id: HistoryFilter) => {
    if (id === "all") return labels.filterAll
    if (id === "food") return labels.filterFood
    if (id === "training") return labels.filterTraining
    return labels.filterMetrics
  }

  const rangeLabel = (days: HistoryRangeDays) => {
    if (days === 7) return labels.range7
    if (days === 90) return labels.range90
    return labels.range30
  }

  return (
    <div>
      {loadFailed ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {FILTERS.map((id) => {
            const active = filter === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(id)}
                className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold ${
                  active
                    ? "border-ink-900 bg-ink-900 text-cream"
                    : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                }`}
              >
                {filterLabel(id)}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={labels.range30}>
          {RANGES.map((days) => {
            const active = rangeDays === days
            return (
              <Link
                key={days}
                href={rangeHref(days)}
                className={`rounded-[9px] border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold ${
                  active
                    ? "border-ink-900 bg-surface text-ink-900"
                    : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                }`}
              >
                {rangeLabel(days)}
              </Link>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-ink-500">{labels.empty}</p>
      ) : (
        <ul className="space-y-1">
          {visible.map((group) => (
            <li key={group.dateKey}>
              <p className="mb-2.5 mt-5 text-xs font-bold uppercase tracking-wide text-ink-500 first:mt-0">
                {group.heading}
              </p>
              <ul className="grid gap-x-12 lg:grid-cols-2">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3.5 border-b border-stone-150 py-3 last:border-0"
                  >
                    <KindIcon kind={entry.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink-900">
                        {entry.title}
                      </p>
                      {entry.subtitle ? (
                        <p className="mt-0.5 text-xs text-ink-500">
                          {entry.subtitle}
                        </p>
                      ) : null}
                      {entry.attribution ? (
                        <p className="mt-0.5 text-xs font-medium text-pine-dark">
                          {entry.attribution}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-ink-500">
                      {new Date(entry.occurredAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
