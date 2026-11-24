"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Avatar, StatusPill, Button } from "@omnifit/ui"
import Link from "next/link"
import { browserTimeZone } from "@/features/client-home/calendar-date"
import { ROUTES, coachClientDetail, coachClientLogTraining, messagesWithRelationship } from "@/lib/routes"
import { archiveCoachClient } from "./archive-coach-client"
import { restoreCoachClient } from "./restore-coach-client"
import { getCoachClientSnapshot } from "./queries"
import { BUCKET_VARIANTS } from "./client-status"
import { formatRelativeDay, formatActivityAt } from "./format-relative"
import type { CoachClientRow, WeightPoint, ActivityItem } from "./types"
import type { CoachClientsLabels } from "./labels"

type CoachClientPreviewPaneProps = {
  client: CoachClientRow | null
  labels: CoachClientsLabels
  templateId?: string | null
  logWithTemplateLabel?: string
}

const PreviewWeightChart = ({
  points,
  emptyLabel,
  weightUnit,
}: {
  points: WeightPoint[]
  emptyLabel: string
  weightUnit: string
}) => {
  if (points.length < 2) {
    return <p className="mt-2 text-sm text-ink-500">{emptyLabel}</p>
  }
  const W = 400
  const H = 72
  const minW = Math.min(...points.map((p) => p.weightKg))
  const maxW = Math.max(...points.map((p) => p.weightKg))
  const range = maxW - minW || 1
  const pad = 8
  const xs = points.map((_, i) => (i / (points.length - 1)) * W)
  const ys = points.map((p) => H - pad - ((p.weightKg - minW) / range) * (H - pad * 2))
  const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden preserveAspectRatio="none">
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--of-pine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4" fill="var(--of-pine)" />
      <text
        x={xs[xs.length - 1]}
        y={Math.max(12, ys[ys.length - 1] - 10)}
        textAnchor="end"
        fontSize="12"
        fontWeight="600"
        fill="var(--of-ink-900)"
      >
        {last.weightKg.toFixed(1)} {weightUnit}
      </text>
    </svg>
  )
}

export const CoachClientPreviewPane = ({
  client,
  labels,
  templateId = null,
  logWithTemplateLabel,
}: CoachClientPreviewPaneProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<"archive" | "restore" | null>(null)
  const [isPending, startTransition] = useTransition()
  const [weightTrend, setWeightTrend] = useState<WeightPoint[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [caloriesTarget, setCaloriesTarget] = useState<number | null>(null)
  const todayIso = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!client || client.status !== "active") {
      setWeightTrend([])
      setActivity([])
      setCaloriesTarget(null)
      return
    }
    let cancelled = false
    void getCoachClientSnapshot(client.clientId, browserTimeZone()).then((result) => {
      if (cancelled || !result.success) return
      setWeightTrend(result.snapshot.weightTrend)
      setActivity(result.snapshot.recentActivity.slice(0, 4))
      setCaloriesTarget(result.snapshot.calories.targetKcal)
    })
    return () => {
      cancelled = true
    }
  }, [client?.clientId, client?.status])

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-ink-400">
        {labels.previewEmpty}
      </div>
    )
  }

  const bucketLabel = client.statusBucket
    ? { on_track: labels.bucketOnTrack, at_risk: labels.bucketAtRisk, new: labels.bucketNew }[
        client.statusBucket
      ]
    : null
  const bucketVariant = client.statusBucket ? BUCKET_VARIANTS[client.statusBucket] : "inactive"

  const handleArchive = () => {
    setError(null)
    setConfirming(null)
    startTransition(async () => {
      const result = await archiveCoachClient(client.clientId)
      if (!result.success) {
        setError(labels.actionError)
        return
      }
      router.refresh()
    })
  }

  const handleRestore = () => {
    setError(null)
    setConfirming(null)
    startTransition(async () => {
      const result = await restoreCoachClient(client.clientId)
      if (!result.success) {
        setError(labels.actionError)
        return
      }
      router.refresh()
    })
  }

  const detailHref = coachClientDetail(client.clientId)
  const relativeLabels = {
    today: labels.relativeToday,
    yesterday: labels.relativeYesterday,
    daysAgo: (n: number) => labels.relativeDaysAgo.replace("{days}", String(n)),
  }
  const lastCheckinDisplay = formatRelativeDay(
    client.lastCheckinOn,
    todayIso,
    relativeLabels
  )
  // ponytail: roster has no weight/adherence — last check-in + calories stand in

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-7 sm:px-9 sm:py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={client.displayName} src={client.avatarUrl} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-[19px] font-bold text-ink-900">
              {client.displayName}
            </h2>
            {bucketLabel ? (
              <div className="mt-1.5">
                <StatusPill variant={bucketVariant} label={bucketLabel} />
              </div>
            ) : (
              <p className="mt-0.5 truncate text-[13px] text-ink-500">{client.email}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {client.status === "active" ? (
            <Link
              href={client.relationshipId ? messagesWithRelationship(client.relationshipId) : ROUTES.messages}
              className="inline-flex min-h-11 items-center justify-center rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-4 text-[13.5px] font-semibold text-ink-900 hover:border-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/60"
            >
              {labels.previewMessage}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title={labels.comingSoon}
              className="inline-flex min-h-11 items-center justify-center rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-4 text-[13.5px] font-semibold text-ink-900 opacity-60"
            >
              {labels.previewMessage}
            </button>
          )}
          {templateId && logWithTemplateLabel && client.status === "active" ? (
            <Link
              href={coachClientLogTraining(client.clientId, { templateId })}
              className="inline-flex min-h-11 items-center justify-center rounded-[9px] border-[1.5px] border-pine bg-pine-tint px-4 text-[13.5px] font-semibold text-pine-dark hover:bg-pine hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/60"
            >
              {logWithTemplateLabel}
            </Link>
          ) : null}
          <Link
            href={detailHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[9px] bg-ink-900 px-4 text-[13.5px] font-semibold text-cream hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/60"
          >
            {labels.previewOpenDetail}
          </Link>
        </div>
      </div>

      {client.status === "active" ? (
        <div className="flex gap-3.5">
          <div className="flex-1 rounded-xl border border-stone-300 bg-surface p-3.5">
            <p className="text-[11.5px] font-semibold text-ink-500">{labels.streakLabel}</p>
            <p className="mt-0.5 font-display text-[19px] font-bold text-ink-900">
              {client.streakDays ?? 0}{" "}
              <span className="text-sm font-semibold text-ink-500">
                {labels.streakDaysSuffix}
              </span>
            </p>
          </div>
          <div className="flex-1 rounded-xl border border-stone-300 bg-surface p-3.5">
            <p className="text-[11.5px] font-semibold text-ink-500">{labels.weightLabel}</p>
            <p className="mt-0.5 font-display text-[19px] font-bold text-pine-dark">
              {weightTrend.length > 0
                ? `${weightTrend[weightTrend.length - 1].weightKg.toFixed(1)} ${labels.weightUnit}`
                : "—"}
            </p>
          </div>
          <div className="flex-1 rounded-xl border border-stone-300 bg-surface p-3.5">
            <p className="text-[11.5px] font-semibold text-ink-500">{labels.adherenceLabel}</p>
            <p className="mt-0.5 font-display text-[19px] font-bold text-ink-900">
              {client.caloriesToday != null && caloriesTarget
                ? `${Math.min(100, Math.round((client.caloriesToday / caloriesTarget) * 100))}%`
                : client.caloriesToday != null
                  ? `${Math.min(100, Math.round((client.caloriesToday / 2000) * 100))}%`
                  : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {client.status === "active" ? (
        <>
          <div className="rounded-[14px] border border-stone-300 bg-surface p-5">
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="font-display text-sm font-semibold text-ink-900">
                {labels.weightTrendTitle.replace(/\s*\(.*?\)\s*$/, "")}
              </span>
              <span className="text-[11.5px] text-ink-500">{labels.weightTrendCaption}</span>
            </div>
            <PreviewWeightChart points={weightTrend} emptyLabel={labels.weightTrendEmpty} weightUnit={labels.weightUnit} />
          </div>

          <div>
            <p className="mb-2.5 font-display text-sm font-semibold text-ink-900">
              {labels.activityTitle}
            </p>
            {activity.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.activityEmpty}</p>
            ) : (
              <ul className="flex flex-col">
                {activity.map((item, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li
                    key={idx}
                    className="flex items-center gap-3 border-b border-stone-150 py-2.5 last:border-0"
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-[9px]"
                      style={{
                        background:
                          item.kind === "workout"
                            ? "var(--of-butter)"
                            : "var(--of-pine-tint)",
                      }}
                      aria-hidden
                    />
                    <span className="flex-1 text-[13.5px] font-medium text-ink-900">
                      {item.label}
                    </span>
                    <span className="text-xs text-ink-500">{formatActivityAt(item.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {confirming === "archive" ? (
        <div className="rounded-xl border border-stone-300 bg-surface p-4 text-sm">
          <p className="font-semibold text-ink-900">{labels.archiveConfirmTitle}</p>
          <p className="mt-1 text-ink-500">{labels.archiveConfirmBody}</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleArchive} disabled={isPending} className="min-h-11">
              {isPending ? labels.previewArchiving : labels.archiveConfirmCta}
            </Button>
            <button
              type="button"
              className="min-h-11 px-3 text-sm font-medium text-ink-500 hover:text-ink-900"
              onClick={() => setConfirming(null)}
              disabled={isPending}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : confirming === "restore" ? (
        <div className="rounded-xl border border-stone-300 bg-surface p-4 text-sm">
          <p className="font-semibold text-ink-900">{labels.restoreConfirmTitle}</p>
          <p className="mt-1 text-ink-500">{labels.restoreConfirmBody}</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleRestore} disabled={isPending} className="min-h-11">
              {isPending ? labels.previewRestoring : labels.restoreConfirmCta}
            </Button>
            <button
              type="button"
              className="min-h-11 px-3 text-sm font-medium text-ink-500 hover:text-ink-900"
              onClick={() => setConfirming(null)}
              disabled={isPending}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto pt-2">
          {client.status === "active" ? (
            <button
              type="button"
              onClick={() => setConfirming("archive")}
              className="inline-flex min-h-11 items-center justify-center rounded-[9px] border-[1.5px] border-stone-300 px-4 text-sm font-medium text-ink-700 hover:bg-stone-100"
            >
              {labels.previewArchive}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming("restore")}
              className="inline-flex min-h-11 items-center justify-center rounded-[9px] border-[1.5px] border-stone-300 px-4 text-sm font-medium text-ink-700 hover:bg-stone-100"
            >
              {labels.previewRestore}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
