import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import type { CoachRosterUsage } from "@/features/client-invite/queries"

type RosterUsageBannerProps = {
  roster: CoachRosterUsage | null
  labels: {
    usage: string
    usageUnlimited: string
    upgrade: string
    rosterUnavailable: string
  }
}

export const RosterUsageBanner = ({ roster, labels }: RosterUsageBannerProps) => {
  if (roster == null) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-150 px-4 py-3.5 text-sm text-ink-700">
        <span role="status">{labels.rosterUnavailable}</span>
      </div>
    )
  }

  const usageLabel =
    roster.limit == null
      ? labels.usageUnlimited.replace("{active}", String(roster.activeCount))
      : labels.usage
          .replace("{active}", String(roster.activeCount))
          .replace("{limit}", String(roster.limit))

  const showUpgrade = roster.limit != null && roster.tier === "free"

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-stone-150 px-4 py-3.5 text-sm text-ink-700">
      <strong className="tabular-nums text-ink-900">{usageLabel}</strong>
      {showUpgrade ? (
        <Link
          href={ROUTES.pricing}
          className="ml-auto shrink-0 font-semibold text-plum-dark hover:underline"
        >
          {labels.upgrade}
        </Link>
      ) : null}
    </div>
  )
}
