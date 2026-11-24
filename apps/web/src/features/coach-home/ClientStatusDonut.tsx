import Link from "next/link"

type ClientStatusDonutLabels = {
  title: string
  subtitle: string
  onTrack: string
  atRisk: string
  newClients: string
  clients: string
  viewAtRisk?: string
}

type ClientStatusDonutProps = {
  onTrack: number
  atRisk: number
  newClients: number
  labels: ClientStatusDonutLabels
}

export const ClientStatusDonut = ({
  onTrack,
  atRisk,
  newClients,
  labels,
}: ClientStatusDonutProps) => {
  const total = onTrack + atRisk + newClients
  const safe = total === 0 ? 1 : total

  const pOnTrack = (onTrack / safe) * 100
  const pAtRisk = (atRisk / safe) * 100

  const pOnTrackEnd = pOnTrack
  const pAtRiskEnd = pOnTrackEnd + pAtRisk

  const gradient = `conic-gradient(
    var(--of-pine) 0% ${pOnTrackEnd.toFixed(2)}%,
    var(--of-butter) ${pOnTrackEnd.toFixed(2)}% ${pAtRiskEnd.toFixed(2)}%,
    var(--of-lilac) ${pAtRiskEnd.toFixed(2)}% 100%
  )`

  const pctStr = (n: number) => `${Math.round((n / safe) * 100)}%`

  return (
    <div className="rounded-2xl border border-stone-300 bg-surface p-[22px]">
      <h2 className="font-display text-base font-semibold text-ink-900">{labels.title}</h2>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{labels.subtitle}</p>

      {/* Donut */}
      <div className="my-4 flex justify-center">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 128,
            height: 128,
            background: gradient,
          }}
          role="img"
          aria-label={`${labels.onTrack}: ${onTrack}, ${labels.atRisk}: ${atRisk}, ${labels.newClients}: ${newClients}`}
        >
          <div className="flex flex-col items-center justify-center rounded-full bg-surface" style={{ width: 80, height: 80 }}>
            <span className="font-display text-xl font-bold text-ink-900">{total}</span>
            <span className="text-[10px] text-ink-500">{labels.clients}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-ink-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-pine" aria-hidden="true" />
            {labels.onTrack}
          </span>
          <span className="font-display text-xs font-semibold text-ink-900">
            {onTrack} · {pctStr(onTrack)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-ink-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-butter" aria-hidden="true" />
            {labels.atRisk}
          </span>
          <span className="font-display text-xs font-semibold text-ink-900">
            {atRisk} · {pctStr(atRisk)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs text-ink-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-lilac" aria-hidden="true" />
            {labels.newClients}
          </span>
          <span className="font-display text-xs font-semibold text-ink-900">
            {newClients} · {pctStr(newClients)}
          </span>
        </div>
      </div>

      {/* "View clients at risk" link — only when there are at-risk clients */}
      {atRisk > 0 && labels.viewAtRisk ? (
        <div className="mt-3">
          <Link
            href="/clients?attention=1"
            className="inline-block text-xs font-semibold text-plum-dark hover:underline"
          >
            {labels.viewAtRisk}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
