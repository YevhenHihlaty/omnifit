import type { CoachDashboardSummary } from "./queries"

type StatTilesLabels = {
  activeClients: string
  sessionsLast30: string
  avgStreak: string
  streakDaysSuffix: string
}

type StatTilesProps = {
  summary: CoachDashboardSummary
  labels: StatTilesLabels
}

const MiniSparkline = ({
  color,
  values,
}: {
  color: string
  values: number[]
}) => {
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-6 items-end gap-1" aria-hidden="true">
      {values.map((v, i) => (
        <div
          // ponytail: stable key by index is fine — static 6-bar sparkline
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.round((v / max) * 100)}%`,
            background: color,
            opacity: i === values.length - 1 ? 1 : 0.35,
            minHeight: "2px",
          }}
        />
      ))}
    </div>
  )
}

export const StatTiles = ({ summary, labels }: StatTilesProps) => (
  <div className="grid gap-[18px] sm:grid-cols-3">
    {/* Active clients — sage */}
    <div className="flex flex-col gap-2.5 rounded-2xl bg-sage p-5">
      <p className="text-[13px] text-pine-dark/85">{labels.activeClients}</p>
      <p className="font-display text-[30px] font-bold leading-none text-ink-900">
        {summary.activeClients}
      </p>
      <MiniSparkline
        color="var(--of-pine-dark)"
        values={[...summary.checkinActivity.lastWeek.slice(-6), summary.activeClients]}
      />
    </div>

    {/* Sessions last 30d — peach */}
    <div className="flex flex-col gap-2.5 rounded-2xl bg-peach p-5">
      <p className="text-[13px] opacity-85" style={{ color: "#8A5A2E" }}>
        {labels.sessionsLast30}
      </p>
      <p className="font-display text-[30px] font-bold leading-none text-ink-900">
        {summary.sessionsLast30}
      </p>
      <MiniSparkline
        color="#8A5A2E"
        values={summary.checkinActivity.thisWeek.slice(-6).concat([summary.sessionsLast30])}
      />
    </div>

    {/* Avg streak — butter */}
    <div className="flex flex-col gap-2.5 rounded-2xl bg-butter p-5">
      <p className="text-[13px] opacity-85" style={{ color: "#8A6B1E" }}>
        {labels.avgStreak}
      </p>
      <div className="flex items-baseline gap-2">
        <p className="font-display text-[30px] font-bold leading-none text-ink-900">
          {summary.avgStreakDays}
        </p>
        <span className="text-xs" style={{ color: "#8A6B1E" }}>
          {labels.streakDaysSuffix}
        </span>
      </div>
      <MiniSparkline
        color="#8A6B1E"
        values={summary.checkinActivity.lastWeek.slice(-6).concat([summary.avgStreakDays])}
      />
    </div>
  </div>
)
