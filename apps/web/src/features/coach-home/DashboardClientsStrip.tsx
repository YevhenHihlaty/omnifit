import Link from "next/link"
import { Avatar, StatusPill } from "@omnifit/ui"
import { coachClientDetail } from "@/lib/routes"
import { BUCKET_VARIANTS } from "@/features/coach-clients/client-status"
import { formatRelativeDay } from "@/features/coach-clients/format-relative"
import type { CoachClientRow } from "@/features/coach-clients/types"

type DashboardClientsStripProps = {
  clients: CoachClientRow[]
  labels: {
    title: string
    filterAll: string
    filterAttention: string
    colClient: string
    colLastCheckin: string
    colProgress?: string
    colStatus: string
    viewAll: string
    empty: string
    bucketOnTrack: string
    bucketAtRisk: string
    bucketNew: string
    relativeToday: string
    relativeYesterday: string
    relativeDaysAgo: string
  }
  attentionHref: string
  allHref: string
}

const bucketLabel = (
  row: CoachClientRow,
  labels: DashboardClientsStripProps["labels"]
): string | null => {
  if (!row.statusBucket) return null
  return {
    on_track: labels.bucketOnTrack,
    at_risk: labels.bucketAtRisk,
    new: labels.bucketNew,
  }[row.statusBucket]
}

/** Compact "Your clients" table for the live dashboard (Web-Dashboard). */
export const DashboardClientsStrip = ({
  clients,
  labels,
  attentionHref,
  allHref,
}: DashboardClientsStripProps) => {
  const preview = clients.slice(0, 5)
  const todayIso = new Date().toISOString().slice(0, 10)
  const relativeLabels = {
    today: labels.relativeToday,
    yesterday: labels.relativeYesterday,
    daysAgo: (n: number) => labels.relativeDaysAgo.replace("{days}", String(n)),
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-stone-300 bg-surface"
      aria-labelledby="dashboard-clients-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <h2
            id="dashboard-clients-heading"
            className="font-display text-base font-semibold text-ink-900"
          >
            {labels.title}
          </h2>
          <div className="flex gap-1.5">
            <Link
              href={allHref}
              className="inline-flex items-center rounded-full bg-ink-900 px-3 py-1 text-[11px] font-semibold text-cream"
            >
              {labels.filterAll}
            </Link>
            <Link
              href={attentionHref}
              className="inline-flex items-center rounded-full border border-stone-300 px-3 py-1 text-[11px] font-semibold text-ink-500 hover:bg-stone-100"
            >
              {labels.filterAttention}
            </Link>
          </div>
        </div>
        <Link
          href={allHref}
          className="text-sm font-semibold text-plum-dark hover:underline"
        >
          {labels.viewAll}
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="border-t border-stone-150 px-5 py-6 text-sm text-ink-500">
          {labels.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[580px] grid-cols-[2.4fr_1.2fr_1.4fr_1.1fr] gap-2 bg-stone-150 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500"
            role="row"
          >
            <span>{labels.colClient}</span>
            <span>{labels.colLastCheckin}</span>
            <span>{labels.colProgress ?? "Progress"}</span>
            <span>{labels.colStatus}</span>
          </div>
          <ul>
            {preview.map((row) => {
              const label = bucketLabel(row, labels)
              const variant = row.statusBucket
                ? BUCKET_VARIANTS[row.statusBucket]
                : "inactive"
              const progressPct =
                row.statusBucket === "on_track"
                  ? 82
                  : row.statusBucket === "at_risk"
                    ? 40
                    : row.statusBucket === "new"
                      ? 15
                      : 0
              return (
                <li key={row.clientId}>
                  <Link
                    href={coachClientDetail(row.clientId)}
                    className="grid min-w-[580px] grid-cols-[2.4fr_1.2fr_1.4fr_1.1fr] items-center gap-2 border-t border-stone-150 px-5 py-3.5 hover:bg-stone-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={row.displayName} src={row.avatarUrl} size="sm" />
                      <span className="truncate text-sm font-semibold text-ink-900">
                        {row.displayName}
                      </span>
                    </div>
                    <span className="truncate text-sm text-ink-500">
                      {formatRelativeDay(row.lastCheckinOn, todayIso, relativeLabels)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-150">
                        <div
                          className="h-full rounded-full bg-pine"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-ink-500">{progressPct}%</span>
                    </div>
                    <span>
                      {label ? (
                        <StatusPill variant={variant} label={label} />
                      ) : (
                        "—"
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
