type CheckInActivityChartLabels = {
  title: string
  thisWeek: string
  lastWeek: string
  days: [string, string, string, string, string, string, string] // Mon–Sun
  ariaLabel: string
}

type CheckInActivityChartProps = {
  thisWeek: number[]
  lastWeek: number[]
  labels: CheckInActivityChartLabels
}

const SVG_W = 680
const SVG_H = 210
const SVG_PAD_X = 20
const SVG_PAD_TOP = 30
const SVG_PAD_BOTTOM = 40
const PLOT_H = SVG_H - SVG_PAD_TOP - SVG_PAD_BOTTOM

const toPoints = (values: number[], maxVal: number): string => {
  const xs = [0, 1, 2, 3, 4, 5, 6].map(
    (i) => SVG_PAD_X + (i / 6) * (SVG_W - 2 * SVG_PAD_X)
  )
  return values
    .map((v, i) => {
      const y = SVG_PAD_TOP + PLOT_H - (maxVal === 0 ? 0 : (v / maxVal) * PLOT_H)
      return `${xs[i]},${y}`
    })
    .join(" ")
}

export const CheckInActivityChart = ({
  thisWeek,
  lastWeek,
  labels,
}: CheckInActivityChartProps) => {
  const allVals = [...thisWeek, ...lastWeek]
  const maxVal = Math.max(...allVals, 1)
  const thisPoints = toPoints(thisWeek, maxVal)
  const lastPoints = toPoints(lastWeek, maxVal)

  const areaPath = (() => {
    const xs = [0, 1, 2, 3, 4, 5, 6].map(
      (i) => SVG_PAD_X + (i / 6) * (SVG_W - 2 * SVG_PAD_X)
    )
    const baseline = SVG_PAD_TOP + PLOT_H
    const pts = thisWeek.map((v, i) => {
      const y = SVG_PAD_TOP + PLOT_H - (maxVal === 0 ? 0 : (v / maxVal) * PLOT_H)
      return `${xs[i]},${y}`
    })
    return `M${xs[0]},${baseline} L${pts.join(" L")} L${xs[6]},${baseline} Z`
  })()

  return (
    <div className="rounded-2xl border border-stone-300 bg-surface p-[22px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink-900">{labels.title}</h2>
        <div className="flex gap-1.5">
          <span className="rounded-full bg-pine px-3 py-1 text-[11px] font-semibold text-surface">
            {labels.thisWeek}
          </span>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-[11px] font-semibold text-ink-500">
            {labels.lastWeek}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        aria-label={labels.ariaLabel}
        role="img"
      >
        {/* Grid lines */}
        <line x1={SVG_PAD_X} y1={SVG_PAD_TOP + PLOT_H} x2={SVG_W - SVG_PAD_X} y2={SVG_PAD_TOP + PLOT_H} stroke="var(--of-stone-300)" strokeWidth="1" />
        <line x1={SVG_PAD_X} y1={SVG_PAD_TOP + PLOT_H / 2} x2={SVG_W - SVG_PAD_X} y2={SVG_PAD_TOP + PLOT_H / 2} stroke="var(--of-stone-150)" strokeWidth="1" />
        <line x1={SVG_PAD_X} y1={SVG_PAD_TOP} x2={SVG_W - SVG_PAD_X} y2={SVG_PAD_TOP} stroke="var(--of-stone-150)" strokeWidth="1" />

        {/* Area fill for this week */}
        <path d={areaPath} fill="var(--of-pine-tint)" opacity="0.7" />

        {/* Last week dashed line */}
        <polyline
          points={lastPoints}
          fill="none"
          stroke="var(--of-stone-300)"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* This week solid line */}
        <polyline
          points={thisPoints}
          fill="none"
          stroke="var(--of-pine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Day labels */}
        {labels.days.map((day, i) => {
          const x = SVG_PAD_X + (i / 6) * (SVG_W - 2 * SVG_PAD_X)
          const anchor = i === 0 ? "start" : i === 6 ? "end" : "middle"
          return (
            <text
              // ponytail: stable key — static 7 day labels
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              x={x}
              y={SVG_H - 8}
              textAnchor={anchor}
              fontFamily="var(--font-inter), Inter, sans-serif"
              fontSize="11"
              fill="var(--of-ink-500)"
            >
              {day}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-[2.5px] w-4 rounded-sm bg-pine"
            aria-hidden="true"
          />
          <span className="text-xs text-ink-500">{labels.thisWeek}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-sm bg-stone-300"
            aria-hidden="true"
          />
          <span className="text-xs text-ink-500">{labels.lastWeek}</span>
        </div>
      </div>

      {/* Visually-hidden accessible data table */}
      <table className="sr-only">
        <caption>{labels.ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.days[0]}</th>
            {labels.days.slice(1).map((d) => (
              <th key={d} scope="col">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{labels.thisWeek}</th>
            {thisWeek.map((v, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <td key={i}>{v}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">{labels.lastWeek}</th>
            {lastWeek.map((v, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <td key={i}>{v}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
