"use client"

import { useMemo, useState } from "react"
import type { CoachAnalyticsPageData } from "./history-analytics-queries"
import type { PhotoCheckIn } from "./analytics-mappers"

export type ClientAnalyticsLabels = {
  adherenceTitle: string
  adherencePeriod: string
  adherenceCount: string
  weightTitle: string
  weightPeriod: string
  weightChange: string
  volumeTitle: string
  volumeSubtitle: string
  volumeEmpty: string
  volumeWeek: string
  volumeAria: string
  measurementsTitle: string
  measurementNotesTitle: string
  measurementNotesEmpty: string
  waist: string
  hips: string
  chest: string
  arm: string
  galleryTitle: string
  galleryEmpty: string
  compareTitle: string
  compareHint: string
  compareA: string
  compareB: string
  checkinCompareTitle: string
  checkinEmpty: string
  metricColumn: string
  sleep: string
  soreness: string
  stress: string
  energy: string
  motivation: string
  poseFront: string
  poseSide: string
  poseBack: string
  kgUnit: string
  cmUnit: string
  loadFailed: string
}

type ClientAnalyticsViewProps = {
  data: CoachAnalyticsPageData
  labels: ClientAnalyticsLabels
  loadFailed?: boolean
}

const WeightSparkline = ({
  points,
}: {
  points: { loggedAt: string; weightKg: number }[]
}) => {
  if (points.length < 2) return null
  const values = points.map((p) => p.weightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 320
  const h = 80
  const pad = 8
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - ((p.weightKg - min) / span) * (h - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--of-pine)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const VolumeBars = ({
  weeks,
  ariaLabel,
}: {
  weeks: { label: string; sets: number }[]
  ariaLabel: string
}) => {
  const max = Math.max(...weeks.map((w) => w.sets), 1)
  const barW = 70
  const gap = 40
  const chartH = 115
  const chartW = weeks.length * (barW + gap)
  const currentWeek = weeks.length - 1

  return (
    <svg
      viewBox={`0 0 ${Math.max(chartW, 200)} 140`}
      className="h-[140px] w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <line
        x1="0"
        y1={chartH}
        x2={chartW}
        y2={chartH}
        stroke="var(--of-stone-150)"
        strokeWidth="1"
      />
      {weeks.map((week, i) => {
        const h = Math.max(4, (week.sets / max) * 90)
        const x = 30 + i * (barW + gap)
        const y = chartH - h
        const isLatest = i === currentWeek && week.sets === 0
        return (
          <g key={`${week.label}-${i}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="5"
              fill={
                isLatest || (i === currentWeek && week.sets < max * 0.4)
                  ? "var(--of-butter)"
                  : "var(--of-pine)"
              }
              opacity={isLatest ? 0.55 : 1}
            />
            <text
              x={x + barW / 2}
              y={130}
              textAnchor="middle"
              fill="var(--of-ink-500)"
              style={{ fontSize: 10, fontFamily: "var(--font-body)" }}
            >
              {week.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const MiniSpark = ({
  values,
  rising = true,
}: {
  values: number[]
  rising?: boolean
}) => {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 52
  const h = 26
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - 2 - ((v - min) / span) * (h - 4)
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={rising ? "var(--of-pine)" : "var(--of-butter-dark, #8A6300)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const PoseStrip = ({
  checkIn,
  pose,
  labels,
}: {
  checkIn: PhotoCheckIn
  pose: "front" | "side" | "back"
  labels: ClientAnalyticsLabels
}) => {
  const photo = checkIn.photos.find((p) => p.pose === pose)
  const poseLabel =
    pose === "front"
      ? labels.poseFront
      : pose === "side"
        ? labels.poseSide
        : labels.poseBack
  return (
    <div className="overflow-hidden rounded-[10px] border border-stone-300 bg-stone-150">
      {photo?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt={poseLabel}
          className="aspect-[3/4] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center text-xs text-ink-500">
          {poseLabel}
        </div>
      )}
    </div>
  )
}

const formatCheckInDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

export const ClientAnalyticsView = ({
  data,
  labels,
  loadFailed = false,
}: ClientAnalyticsViewProps) => {
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [comparePose, setComparePose] = useState<"front" | "side" | "back">(
    "front"
  )
  const [compareA, setCompareA] = useState(0)
  const [compareB, setCompareB] = useState(1)

  const circumference = 2 * Math.PI * 46
  const offset =
    circumference - (data.adherencePercent / 100) * circumference

  const checkIns = data.photoCheckIns
  const selected = checkIns[galleryIndex] ?? checkIns[0] ?? null
  const left = checkIns[compareA] ?? null
  const right = checkIns[compareB] ?? null

  const volumeWeeks = useMemo(
    () =>
      data.volumeWeeks.map((w, i) => ({
        ...w,
        label: labels.volumeWeek.replace("{n}", String(i + 1)),
      })),
    [data.volumeWeeks, labels.volumeWeek]
  )

  const checkinMetrics = useMemo(
    () =>
      [
        ["sleep", labels.sleep],
        ["soreness", labels.soreness],
        ["stress", labels.stress],
        ["energy", labels.energy],
        ["motivation", labels.motivation],
      ] as const,
    [labels]
  )

  const measurementTiles = [
    [labels.waist, data.measurements.waistCm, data.measurementSparks.waist],
    [labels.hips, data.measurements.hipsCm, data.measurementSparks.hips],
    [labels.chest, data.measurements.chestCm, data.measurementSparks.chest],
    [labels.arm, data.measurements.armCm, data.measurementSparks.arm],
  ] as const

  const handleSelectGallery = (index: number) => {
    setGalleryIndex(index)
  }

  return (
    <div className="space-y-5">
      {loadFailed ? (
        <p className="text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
            <section className="flex flex-col items-center gap-2.5 rounded-[14px] border border-stone-300 bg-surface p-5">
              <h2 className="font-display text-[13.5px] font-semibold text-ink-900">
                {labels.adherenceTitle}
              </h2>
              <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden>
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  fill="none"
                  stroke="var(--of-stone-150)"
                  strokeWidth="11"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  fill="none"
                  stroke="var(--of-pine)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 56 56)"
                />
                <text
                  x="56"
                  y="62"
                  textAnchor="middle"
                  className="fill-ink-900"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 24,
                  }}
                >
                  {data.adherencePercent}%
                </text>
              </svg>
              <p className="text-[11.5px] text-ink-500">{labels.adherencePeriod}</p>
              <p className="text-xs text-ink-500">
                {labels.adherenceCount
                  .replace("{completed}", String(data.workoutsCompleted))
                  .replace("{target}", String(data.workoutsTarget))}
              </p>
            </section>

            <section className="rounded-[14px] border border-stone-300 bg-surface p-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-[13.5px] font-semibold text-ink-900">
                  {labels.weightTitle}
                </h2>
                <span className="text-xs text-ink-500">{labels.weightPeriod}</span>
              </div>
              {data.weightChangeKg != null ? (
                <p className="mb-1 text-xs font-semibold text-pine-dark">
                  {labels.weightChange.replace(
                    "{value}",
                    `${data.weightChangeKg > 0 ? "+" : ""}${data.weightChangeKg}`
                  )}
                </p>
              ) : null}
              <WeightSparkline points={data.weightPoints} />
            </section>
          </div>

          <section className="rounded-[14px] border border-stone-300 bg-surface p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-[13.5px] font-semibold text-ink-900">
                {labels.volumeTitle}
              </h2>
              <span className="text-[11px] text-ink-500">
                {labels.volumeSubtitle}
              </span>
            </div>
            {data.volumeWeeks.every((w) => w.sets === 0) ? (
              <p className="text-sm text-ink-500">{labels.volumeEmpty}</p>
            ) : (
              <VolumeBars weeks={volumeWeeks} ariaLabel={labels.volumeAria} />
            )}
          </section>

          <section className="rounded-[14px] border border-stone-300 bg-surface p-5">
            <h2 className="mb-3 font-display text-[13.5px] font-semibold text-ink-900">
              {labels.galleryTitle}
            </h2>
            {checkIns.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.galleryEmpty}</p>
            ) : (
              <>
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {checkIns.map((c, i) => {
                    const photo =
                      c.photos.find((ph) => ph.pose === "front") ??
                      c.photos[0]
                    const active = i === galleryIndex
                    return (
                      <button
                        key={c.bodyMetricsId}
                        type="button"
                        onClick={() => handleSelectGallery(i)}
                        aria-pressed={active}
                        aria-label={formatCheckInDate(c.loggedAt)}
                        className={`shrink-0 overflow-hidden rounded-[9px] border-2 bg-stone-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/50 ${
                          active
                            ? "border-pine"
                            : "border-stone-300 hover:border-pine/60"
                        }`}
                      >
                        <div className="h-20 w-16">
                          {photo?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="block px-1 py-1 text-center text-[10px] font-semibold tabular-nums text-ink-500">
                          {formatCheckInDate(c.loggedAt)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {selected ? (
                  <div className="grid grid-cols-3 gap-3.5">
                    <PoseStrip checkIn={selected} pose="front" labels={labels} />
                    <PoseStrip checkIn={selected} pose="side" labels={labels} />
                    <PoseStrip checkIn={selected} pose="back" labels={labels} />
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-3.5">
          <h2 className="sr-only">{labels.measurementsTitle}</h2>
          {measurementTiles.map(([label, value, spark]) => {
            const rising =
              spark.length < 2 || spark[spark.length - 1]! <= spark[0]!
            return (
              <div
                key={label}
                className="flex items-center justify-between rounded-[14px] border border-stone-300 bg-surface px-4 py-3.5"
              >
                <div>
                  <div className="text-[11.5px] font-semibold text-ink-500">
                    {label}
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold text-ink-900">
                    {value != null ? `${value}${labels.cmUnit}` : "—"}
                  </div>
                </div>
                <MiniSpark values={[...spark]} rising={rising} />
              </div>
            )
          })}
          <div className="rounded-[14px] border border-stone-300 bg-surface p-4">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900">
              {labels.measurementNotesTitle}
            </h3>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-700">
              {data.measurementNotes?.trim()
                ? data.measurementNotes
                : labels.measurementNotesEmpty}
            </p>
          </div>
        </aside>
      </div>

      <section className="rounded-[14px] border border-stone-300 bg-surface p-5">
        <h2 className="font-display text-[13.5px] font-semibold text-ink-900">
          {labels.compareTitle}
        </h2>
        <p className="mt-1 text-xs text-ink-500">{labels.compareHint}</p>
        {checkIns.length < 2 ? (
          <p className="mt-3 text-sm text-ink-500">{labels.galleryEmpty}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="text-xs font-semibold text-ink-700">
                {labels.compareA}
                <select
                  className="ml-2 rounded border border-stone-300 bg-surface px-2 py-1"
                  value={compareA}
                  onChange={(e) => setCompareA(Number(e.target.value))}
                >
                  {checkIns.map((c, i) => (
                    <option key={c.bodyMetricsId} value={i}>
                      {c.loggedAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-700">
                {labels.compareB}
                <select
                  className="ml-2 rounded border border-stone-300 bg-surface px-2 py-1"
                  value={compareB}
                  onChange={(e) => setCompareB(Number(e.target.value))}
                >
                  {checkIns.map((c, i) => (
                    <option key={c.bodyMetricsId} value={i}>
                      {c.loggedAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1.5">
                {(["front", "side", "back"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setComparePose(p)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      comparePose === p
                        ? "bg-pine text-surface"
                        : "bg-stone-150 text-ink-700"
                    }`}
                  >
                    {p === "front"
                      ? labels.poseFront
                      : p === "side"
                        ? labels.poseSide
                        : labels.poseBack}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {left ? (
                <PoseStrip checkIn={left} pose={comparePose} labels={labels} />
              ) : null}
              {right ? (
                <PoseStrip checkIn={right} pose={comparePose} labels={labels} />
              ) : null}
            </div>
          </>
        )}
      </section>

      <section className="rounded-[14px] border border-stone-300 bg-surface p-5">
        <h2 className="mb-3 font-display text-[13.5px] font-semibold text-ink-900">
          {labels.checkinCompareTitle}
        </h2>
        {!data.checkinA ? (
          <p className="text-sm text-ink-500">{labels.checkinEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-150 text-xs text-ink-500">
                  <th className="py-2 font-semibold">{labels.metricColumn}</th>
                  <th className="py-2 font-semibold">
                    {data.checkinA.weekStart}
                  </th>
                  <th className="py-2 font-semibold">
                    {data.checkinB?.weekStart ?? "—"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkinMetrics.map(([key, label]) => (
                  <tr
                    key={key}
                    className="border-b border-stone-150 last:border-0"
                  >
                    <td className="py-2 text-ink-700">{label}</td>
                    <td className="py-2 font-semibold">
                      {data.checkinA?.[key] ?? "–"}
                    </td>
                    <td className="py-2 font-semibold">
                      {data.checkinB?.[key] ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
