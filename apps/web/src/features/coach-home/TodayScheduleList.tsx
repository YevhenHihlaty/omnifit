import type { TodaySession } from "./queries"

type TodayScheduleListLabels = {
  title: string
  empty: string
  statusLabels: Partial<Record<string, string>>
}

type TodayScheduleListProps = {
  sessions: TodaySession[]
  labels: TodayScheduleListLabels
}

const formatTime = (isoStr: string): string => {
  try {
    return new Date(isoStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return isoStr
  }
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  done: { bg: "var(--of-stone-300)", text: "var(--of-ink-700)" },
  completed: { bg: "var(--of-stone-300)", text: "var(--of-ink-700)" },
  in_progress: { bg: "var(--of-ink-900)", text: "var(--of-cream)" },
  upcoming: { bg: "var(--of-lilac)", text: "var(--of-plum-dark)" },
  scheduled: { bg: "var(--of-lilac)", text: "var(--of-plum-dark)" },
}

const statusStyle = (status: string) =>
  STATUS_STYLES[status.toLowerCase()] ?? {
    bg: "var(--of-stone-150)",
    text: "var(--of-ink-700)",
  }

const rowBackground = (status: string): string | undefined => {
  const key = status.toLowerCase()
  if (key === "in_progress") return "var(--of-peach)"
  if (key === "done" || key === "completed") return "var(--of-stone-150)"
  return undefined // upcoming/next — transparent per design
}

export const TodayScheduleList = ({ sessions, labels }: TodayScheduleListProps) => (
  <div className="rounded-2xl border border-stone-300 bg-surface p-5">
    <h2 className="mb-3 font-display text-[15px] font-semibold text-ink-900">{labels.title}</h2>

    {sessions.length === 0 ? (
      <p className="text-sm text-ink-500">{labels.empty}</p>
    ) : (
      <ol className="flex flex-col gap-2" aria-label={labels.title}>
        {sessions.map((s) => {
          const { bg, text } = statusStyle(s.status)
          const statusKey = s.status.toLowerCase()
          const statusChipLabel = labels.statusLabels[statusKey] ?? s.status
          const rowBg = rowBackground(s.status)
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5"
              style={rowBg ? { background: rowBg } : undefined}
            >
              <span
                className="w-[46px] shrink-0 font-display text-xs"
                style={{
                  color:
                    statusKey === "in_progress" ? "#8A5A2E" : "var(--of-ink-500)",
                }}
              >
                {formatTime(s.startsAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-semibold text-ink-900"
                  title={`${s.title} · ${s.clientName}`}
                >
                  {s.title} · {s.clientName}
                </p>
                <p
                  className="text-[11px]"
                  style={{
                    color:
                      statusKey === "in_progress" ? "#8A5A2E" : "var(--of-ink-500)",
                  }}
                >
                  {s.durationMinutes} min
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: bg, color: text }}
              >
                {statusChipLabel}
              </span>
            </li>
          )
        })}
      </ol>
    )}
  </div>
)
