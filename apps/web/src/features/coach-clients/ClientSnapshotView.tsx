import type { ReactNode } from "react"
import { Avatar, StatusPill } from "@omnifit/ui"
import { BUCKET_VARIANTS } from "./client-status"
import { formatActivityAt } from "./format-relative"
import type { ClientSnapshot, WeightPoint, CheckinPoint, ActivityItem } from "./types"
import type { SnapshotLabels } from "./labels"

type ClientSnapshotViewProps = {
  snapshot: ClientSnapshot
  labels: SnapshotLabels
  /** Message / Edit plan CTAs — placed top-right of client header (Web-ClientDetail) */
  headerActions?: ReactNode
  /** When true, omit avatar/name row (page owns the chrome above tabs) */
  hideClientHeader?: boolean
  locale?: string
}

// ── Mini SVG charts ────────────────────────────────────────────────────────

const WeightTrendChart = ({
  points,
  emptyLabel,
}: {
  points: WeightPoint[]
  emptyLabel: string
}) => {
  if (points.length < 2) {
    return <p className="mt-2 text-sm text-ink-500">{emptyLabel}</p>
  }
  const W = 300
  const H = 88
  const minW = Math.min(...points.map((p) => p.weightKg))
  const maxW = Math.max(...points.map((p) => p.weightKg))
  const range = maxW - minW || 1
  const pad = 10
  const xs = points.map((_, i) => (i / (points.length - 1)) * W)
  const ys = points.map((p) => H - pad - ((p.weightKg - minW) / range) * (H - pad * 2))
  const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const last = points[points.length - 1]
  const lastX = xs[xs.length - 1]
  const lastY = ys[ys.length - 1]
  const firstDate = points[0].on
  const lastDate = last.on

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    } catch {
      return iso.slice(0, 10)
    }
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={H - 4}
          x2={W}
          y2={H - 4}
          stroke="var(--of-stone-150)"
          strokeWidth="1"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--of-pine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r="4" fill="var(--of-pine)" />
        <text
          x={lastX}
          y={Math.max(12, lastY - 10)}
          textAnchor="end"
          fontFamily="var(--font-space-grotesk), Space Grotesk, sans-serif"
          fontWeight="600"
          fontSize="12"
          fill="var(--of-ink-900)"
        >
          {last.weightKg.toFixed(1)} kg
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-500">
        <span>{fmt(firstDate)}</span>
        <span>{fmt(lastDate)}</span>
      </div>
    </div>
  )
}

const CheckinBarChart = ({
  checkins,
  emptyLabel,
}: {
  checkins: CheckinPoint[]
  emptyLabel: string
}) => {
  if (checkins.length === 0) {
    return <p className="mt-2 text-sm text-ink-500">{emptyLabel}</p>
  }
  const H = 56
  const total = checkins.length
  const gap = 4
  const barW = Math.max(8, Math.floor((300 - gap * (total - 1)) / total))
  const W = total * barW + (total - 1) * gap

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {checkins.map((c, i) => {
        // RPC scores are 1–5 averages; treat missing as 0
        const score = c.present ? (c.score ?? 0) : 0
        const barH = Math.max(4, (Math.min(score, 5) / 5) * H)
        const y = H - barH
        const x = i * (barW + gap)
        const isMissedOrLow = !c.present || score < 2.5
        return (
          <rect
            key={c.weekStart}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx="3"
            fill={isMissedOrLow ? "var(--of-butter)" : "var(--of-pine)"}
            opacity={isMissedOrLow ? 0.55 : 1}
          />
        )
      })}
    </svg>
  )
}

// ── Activity kind → colour map ─────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = {
  meal: "var(--of-pine-tint)",
  workout: "var(--of-butter)",
  metrics: "var(--of-lilac)",
  checkin: "var(--of-sage)",
  habit: "var(--of-lilac)",
}

const ActivityKindIcon = ({ kind }: { kind: string }) => (
  <span
    className="h-5 w-5 shrink-0 rounded-[4px]"
    style={{ background: KIND_COLOR[kind.toLowerCase()] ?? "var(--of-stone-300)" }}
    aria-hidden
  />
)

// ── Stat card ──────────────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  valueCls,
  sub,
}: {
  label: string
  value: string
  valueCls?: string
  sub?: string
}) => (
  <div className="flex flex-col gap-0.5 rounded-[12px] border border-stone-300 bg-surface py-4 px-[18px]">
    <p className="text-xs font-semibold text-ink-500">{label}</p>
    <p className={["font-display text-[22px] font-bold text-ink-900", valueCls].filter(Boolean).join(" ")}>
      {value}
    </p>
    {sub ? <p className="text-xs text-ink-500">{sub}</p> : null}
  </div>
)

// ── Main view ──────────────────────────────────────────────────────────────

export const ClientSnapshotView = ({
  snapshot,
  labels,
  headerActions,
  hideClientHeader = false,
  locale,
}: ClientSnapshotViewProps) => {
  const { client, stats, calories, habits, recentActivity, upcomingSession, weightTrend, checkins, coachNote } = snapshot
  const bucket = client.statusBucket

  // Localized bucket labels from snapshot labels (per spec)
  const bucketLabelMap: Record<string, string> = {
    on_track: labels.bucketOnTrack,
    at_risk: labels.bucketAtRisk,
    new: labels.bucketNew,
  }
  const bucketLabel = bucket ? (bucketLabelMap[bucket] ?? null) : null
  const bucketVariant = bucket ? BUCKET_VARIANTS[bucket] : "inactive"

  const weightChangeStr =
    stats.weightChangeKg != null
      ? `${stats.weightChangeKg > 0 ? "+" : ""}${stats.weightChangeKg.toFixed(1)} kg`
      : "—"

  // Pine-dark text when weight change is negative (progress = loss)
  const weightCls = stats.weightChangeKg != null && stats.weightChangeKg < 0
    ? "text-pine-dark"
    : undefined

  const sessionsStr =
    stats.sessionsTotal > 0
      ? `${stats.sessionsCompleted} / ${stats.sessionsTotal}`
      : "—"

  return (
    <div className="flex min-h-0 gap-6">
      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {!hideClientHeader ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={client.displayName} src={client.avatarUrl} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-display text-xl font-bold text-ink-900">{client.displayName}</h2>
                  {bucketLabel ? (
                    <StatusPill variant={bucketVariant} label={bucketLabel} />
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-500">{client.email}</p>
              </div>
            </div>
            {headerActions ? (
              <div className="flex flex-wrap gap-2.5">{headerActions}</div>
            ) : null}
          </div>
        ) : null}

        {/* Stat cards — design order: Streak → Weight → Adherence → Sessions */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <StatCard
            label={labels.statsStreak}
            value={`${stats.streakDays} ${labels.streakDaysSuffix}`}
          />
          <StatCard
            label={labels.statsWeightChange}
            value={weightChangeStr}
            valueCls={weightCls}
          />
          <StatCard
            label={labels.statsAdherence}
            value={`${stats.adherencePct}%`}
          />
          <StatCard
            label={labels.statsSessions}
            value={sessionsStr}
          />
        </div>

        {/* Calories today */}
        <div className="rounded-[14px] border border-stone-300 bg-surface py-4 px-[18px]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
            {labels.calConsumed}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-display text-xl font-bold text-ink-900">
              {calories.consumedKcal.toLocaleString()}
            </p>
            <span className="text-sm text-ink-400">{labels.kcalUnit}</span>
            {calories.targetKcal != null ? (
              <span className="text-sm text-ink-500">
                / {calories.targetKcal.toLocaleString()} {labels.calTarget}
              </span>
            ) : (
              <span className="text-sm text-ink-500">{labels.calNoTarget}</span>
            )}
          </div>
        </div>

        {/* Weight trend */}
        <section aria-labelledby="weight-trend-heading">
          <div className="flex items-baseline justify-between">
            <h3
              id="weight-trend-heading"
              className="font-display text-[15px] font-semibold text-ink-900"
            >
              {labels.weightTrendTitle.replace(/\s*\(.*?\)\s*$/, "")}
            </h3>
            <span className="text-xs text-ink-500">{labels.weightTrendCaption}</span>
          </div>
          <div className="mt-3 rounded-[14px] border border-stone-300 bg-surface py-5 px-[22px]">
            <WeightTrendChart points={weightTrend} emptyLabel={labels.weightTrendEmpty} />
          </div>
        </section>

        {/* Weekly check-ins */}
        <section aria-labelledby="checkins-heading">
          <h3
            id="checkins-heading"
            className="font-display text-sm font-semibold text-ink-700"
          >
            {labels.checkinsTitle}
          </h3>
          <div className="mt-1 rounded-[14px] border border-stone-300 bg-surface py-5 px-[22px]">
            <CheckinBarChart checkins={checkins} emptyLabel={labels.checkinsEmpty} />
          </div>
        </section>

        {/* Habits */}
        {habits.length > 0 ? (
          <section aria-labelledby="habits-heading">
            <h3
              id="habits-heading"
              className="font-display text-sm font-semibold text-ink-700"
            >
              {labels.habitsTitle}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {habits.map((habit) => (
                <li
                  key={habit.habitId}
                  className="flex items-center gap-3 rounded-lg border border-stone-300 bg-surface px-4 py-2.5"
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      habit.done
                        ? "bg-pine text-white"
                        : "border border-stone-300 bg-stone-100 text-ink-400",
                    ].join(" ")}
                    aria-label={habit.done ? labels.doneAria : labels.incompleteAria}
                  >
                    {habit.done ? "✓" : ""}
                  </span>
                  <span className="flex-1 text-sm text-ink-900">{habit.title}</span>
                  <span className="text-xs text-ink-500">
                    {habit.currentValue}/{habit.targetValue} {habit.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Recent activity */}
        <section aria-labelledby="activity-heading">
          <h3
            id="activity-heading"
            className="font-display text-sm font-semibold text-ink-700"
          >
            {labels.activityTitle}
          </h3>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">{labels.activityEmpty}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5">
              {recentActivity.map((item: ActivityItem, idx: number) => (
                // ponytail: idx key OK — static server-rendered list, never reordered
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx} className="flex items-center gap-3 border-b border-stone-150 py-2.5 text-sm last:border-0">
                  <ActivityKindIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-ink-900">{item.label}</span>
                    {item.attributedTo ? (
                      <p className="mt-0.5 text-xs font-medium text-pine-dark">
                        {item.attributedTo}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {formatActivityAt(item.at, new Date(), locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Right rail ──────────────────────────────────────────────────── */}
      <aside className="w-[300px] shrink-0 flex flex-col gap-4">
        {/* Client info */}
        <div className="rounded-[14px] border border-stone-300 bg-surface p-5">
          <h3 className="font-display text-sm font-semibold text-ink-700 mb-3">
            {labels.clientInfoTitle}
          </h3>
          <dl className="flex flex-col gap-2 text-sm">
            {client.goal ? (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{labels.goalLabel}</dt>
                <dd className="mt-0.5 text-ink-900">{client.goal}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{labels.emailLabel}</dt>
              <dd className="mt-0.5 truncate text-ink-900">{client.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{labels.sinceLabel}</dt>
              <dd className="mt-0.5 text-ink-900">{client.since}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{labels.programLabel}</dt>
              <dd className="mt-0.5 text-ink-500">—</dd>
            </div>
          </dl>
        </div>

        {/* Upcoming session */}
        <div className="rounded-[14px] border border-stone-300 bg-surface p-5">
          <h3 className="font-display text-sm font-semibold text-ink-700 mb-3">
            {labels.upcomingTitle}
          </h3>
          {upcomingSession ? (
            <div className="flex gap-3">
              <div className="w-[3px] shrink-0 rounded-sm bg-pine" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {upcomingSession.title ?? labels.sessionFallback}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {new Date(upcomingSession.startsAt).toLocaleString()}
                  {upcomingSession.durationMinutes
                    ? ` · ${upcomingSession.durationMinutes} ${labels.minutesSuffix}`
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-500">{labels.upcomingNone}</p>
          )}
        </div>

        {/* Coach notes */}
        <div className="rounded-[14px] border border-stone-300 bg-surface p-5">
          <h3 className="font-display text-sm font-semibold text-ink-700 mb-3">
            {labels.notesTitle}
          </h3>
          {coachNote ? (
            <p className="text-sm text-ink-900 whitespace-pre-wrap">{coachNote.body}</p>
          ) : (
            <p className="text-sm text-ink-500">{labels.notesEmpty}</p>
          )}
        </div>
      </aside>
    </div>
  )
}
