import { EmptyState } from "@omnifit/ui"
import { Users, Calendar, ActivitySquare, ClipboardList } from "lucide-react"
import { InviteClientDialog } from "@/features/client-invite/InviteClientDialog"
import { PendingInvitesList } from "@/features/client-invite/PendingInvitesList"
import { RosterUsageBanner } from "@/features/client-invite/RosterUsageBanner"
import type {
  ClientInviteDialogLabels,
  PendingInvitesListLabels,
} from "@/features/client-invite/labels"
import type { CoachRosterUsage, PendingClientInvite } from "@/features/client-invite/queries"
import type { CoachClientRow } from "@/features/coach-clients/types"
import { shouldShowLiveDashboard } from "./dashboard-tiles"
import type { CoachDashboardSummary } from "./queries"
import { StatTiles } from "./StatTiles"
import { CheckInActivityChart } from "./CheckInActivityChart"
import { ClientStatusDonut } from "./ClientStatusDonut"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { TodayScheduleList } from "./TodayScheduleList"
import { DashboardClientsStrip } from "./DashboardClientsStrip"
import { DashboardGreeting } from "./DashboardGreeting"
import { MiniCalendar } from "./MiniCalendar"

type RecentMessage = { id: string; senderName: string; preview: string }

type CoachDashboardViewProps = {
  canInvite: boolean
  roster: CoachRosterUsage | null
  pendingInvites: PendingClientInvite[]
  summary: CoachDashboardSummary | false | null
  clients: CoachClientRow[]
  inviteLabels: ClientInviteDialogLabels
  pendingLabels: PendingInvitesListLabels
  displayName?: string
  recentMessages?: RecentMessage[]
  sessionDates?: string[]
  labels: {
    title: string
    subtitle: string
    greetingMorning?: string
    greetingAfternoon?: string
    greetingEvening?: string
    calendarSchedule?: string
    calendarPrev?: string
    calendarNext?: string
    recentMessagesTitle?: string
    recentMessagesOpenInbox?: string
    clients: { title: string; description: string }
    sessions: { title: string; description: string }
    checkIns: { title: string; description: string }
    activity: { title: string; description: string }
    scheduleSession: string
    scheduleComingSoon: string
    searchPlaceholder?: string
    notifications?: string
    newSession?: string
    rosterUnavailable: string
    usage: string
    usageUnlimited: string
    upgrade: string
    live: {
      activeClients: string
      sessionsLast30: string
      avgStreak: string
      streakDaysSuffix: string
      chartTitle: string
      chartThisWeek: string
      chartLastWeek: string
      chartAriaLabel: string
      chartDays: [string, string, string, string, string, string, string]
      donutTitle: string
      donutSubtitle: string
      donutOnTrack: string
      donutAtRisk: string
      donutNew: string
      donutClients: string
      todayTitle: string
      todayEmpty: string
      todayStatusDone: string
      todayStatusCompleted: string
      todayStatusInProgress: string
      todayStatusUpcoming: string
      todayStatusScheduled: string
      viewClients: string
      viewAtRisk: string
      loadError: string
      clientsStripTitle: string
      clientsStripColClient: string
      clientsStripColLastCheckin: string
      clientsStripColStatus: string
      clientsStripEmpty: string
      filterAll: string
      filterAttention: string
      relativeToday: string
      relativeYesterday: string
      relativeDaysAgo: string
    }
  }
}

export const CoachDashboardView = ({
  canInvite,
  roster,
  pendingInvites,
  summary,
  clients,
  inviteLabels,
  pendingLabels,
  displayName,
  recentMessages,
  sessionDates,
  labels,
}: CoachDashboardViewProps) => {
  const showLive = shouldShowLiveDashboard(summary)
  // summary === false means RPC error
  const hasError = summary === false

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {displayName && labels.greetingMorning && labels.greetingAfternoon && labels.greetingEvening ? (
          <DashboardGreeting
            displayName={displayName}
            greetingMorning={labels.greetingMorning}
            greetingAfternoon={labels.greetingAfternoon}
            greetingEvening={labels.greetingEvening}
            subtitle={labels.subtitle}
          />
        ) : (
          <div>
            <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.01em] text-ink-900">
              {labels.title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">{labels.subtitle}</p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-[42px] items-center gap-2 rounded-[10px] border border-stone-300 bg-surface px-4">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-ink-500">
              <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <span className="text-[13px] text-ink-500">{labels.searchPlaceholder ?? "Search clients…"}</span>
          </div>
          <button
            type="button"
            aria-label={labels.notifications ?? "Notifications"}
            className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-stone-300 bg-surface"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ink-700">
              <path d="M6,10 a6,6 0 0 1 12,0 c0,5 2,6 2,6 H4 c0,0 2,-1 2,-6 Z" /><path d="M10,20 a2,2 0 0 0 4,0" />
            </svg>
            <span className="absolute right-[9px] top-[8px] h-[7px] w-[7px] rounded-full bg-terracotta" />
          </button>
          <a
            href="/sessions/new"
            className="inline-flex h-[42px] items-center rounded-[10px] bg-ink-900 px-5 text-sm font-semibold text-cream hover:bg-ink-800"
          >
            + {labels.newSession ?? "New session"}
          </a>
        </div>
      </div>

      <div className="mt-4">
        <RosterUsageBanner
          roster={roster}
          labels={{
            usage: labels.usage,
            usageUnlimited: labels.usageUnlimited,
            upgrade: labels.upgrade,
            rosterUnavailable: labels.rosterUnavailable,
          }}
        />
      </div>

      {!canInvite && roster != null ? (
        <p className="mt-3 text-sm text-ink-500" role="status">
          {inviteLabels.capMessage}
        </p>
      ) : null}

      {hasError ? (
        <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {labels.live.loadError}
        </p>
      ) : null}

      {showLive ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_400px]">
          <div className="flex min-w-0 flex-col gap-5">
            <StatTiles
              summary={summary}
              labels={{
                activeClients: labels.live.activeClients,
                sessionsLast30: labels.live.sessionsLast30,
                avgStreak: labels.live.avgStreak,
                streakDaysSuffix: labels.live.streakDaysSuffix,
              }}
            />

            <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
              <CheckInActivityChart
                thisWeek={summary.checkinActivity.thisWeek}
                lastWeek={summary.checkinActivity.lastWeek}
                labels={{
                  title: labels.live.chartTitle,
                  thisWeek: labels.live.chartThisWeek,
                  lastWeek: labels.live.chartLastWeek,
                  ariaLabel: labels.live.chartAriaLabel,
                  days: labels.live.chartDays,
                }}
              />
              <ClientStatusDonut
                onTrack={summary.statusCounts.onTrack}
                atRisk={summary.statusCounts.atRisk}
                newClients={summary.statusCounts.new}
                labels={{
                  title: labels.live.donutTitle,
                  subtitle: labels.live.donutSubtitle,
                  onTrack: labels.live.donutOnTrack,
                  atRisk: labels.live.donutAtRisk,
                  newClients: labels.live.donutNew,
                  clients: labels.live.donutClients,
                  viewAtRisk: labels.live.viewAtRisk,
                }}
              />
            </div>

            <DashboardClientsStrip
              clients={clients}
              attentionHref="/clients?attention=1"
              allHref="/clients"
              labels={{
                title: labels.live.clientsStripTitle,
                filterAll: labels.live.filterAll,
                filterAttention: labels.live.filterAttention,
                colClient: labels.live.clientsStripColClient,
                colLastCheckin: labels.live.clientsStripColLastCheckin,
                colStatus: labels.live.clientsStripColStatus,
                viewAll: labels.live.viewClients,
                empty: labels.live.clientsStripEmpty,
                bucketOnTrack: labels.live.donutOnTrack,
                bucketAtRisk: labels.live.donutAtRisk,
                bucketNew: labels.live.donutNew,
                relativeToday: labels.live.relativeToday,
                relativeYesterday: labels.live.relativeYesterday,
                relativeDaysAgo: labels.live.relativeDaysAgo,
              }}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-[18px]">
            <MiniCalendar
              sessionDates={sessionDates}
              scheduleLabel={labels.calendarSchedule ?? "+ Schedule a session"}
              prevLabel={labels.calendarPrev ?? "Previous month"}
              nextLabel={labels.calendarNext ?? "Next month"}
            />

            <TodayScheduleList
              sessions={summary.todaySessions}
              labels={{
                title: labels.live.todayTitle,
                empty: labels.live.todayEmpty,
                statusLabels: {
                  done: labels.live.todayStatusDone,
                  completed: labels.live.todayStatusCompleted,
                  in_progress: labels.live.todayStatusInProgress,
                  upcoming: labels.live.todayStatusUpcoming,
                  scheduled: labels.live.todayStatusScheduled,
                },
              }}
            />

            {recentMessages && recentMessages.length > 0 ? (
              <div className="rounded-[16px] border border-stone-300 bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-[15px] font-semibold text-ink-900">
                    {labels.recentMessagesTitle ?? "Recent messages"}
                  </h2>
                  <Link
                    href={ROUTES.messages}
                    className="text-[12px] font-semibold text-plum-dark hover:underline"
                  >
                    {labels.recentMessagesOpenInbox ?? "Open inbox"}
                  </Link>
                </div>
                <ul className="flex flex-col gap-3">
                  {recentMessages.map((msg) => (
                    <li key={msg.id}>
                      <Link
                        href={`${ROUTES.messages}/${encodeURIComponent(msg.id)}`}
                        className="flex items-start gap-[11px] hover:opacity-80"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky text-[11px] font-semibold text-plum-dark">
                          {msg.senderName
                            ? msg.senderName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
                            : "?"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink-900 leading-tight">
                            {msg.senderName}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-500">
                            {msg.preview}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : !hasError ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={labels.clients.title}
            description={labels.clients.description}
            action={<InviteClientDialog canInvite={canInvite} labels={inviteLabels} />}
          />

          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title={labels.sessions.title}
            description={labels.sessions.description}
            action={
              <button
                type="button"
                disabled
                title={labels.scheduleComingSoon}
                className="inline-flex min-h-11 items-center rounded-[10px] border-[1.5px] border-stone-300 bg-transparent px-4 text-sm font-medium text-ink-500 opacity-70"
              >
                {labels.scheduleSession}
              </button>
            }
          />

          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title={labels.checkIns.title}
            description={labels.checkIns.description}
          />

          <EmptyState
            icon={<ActivitySquare className="h-8 w-8" />}
            title={labels.activity.title}
            description={labels.activity.description}
          />
        </div>
      ) : null}

      <PendingInvitesList invites={pendingInvites} labels={pendingLabels} />
    </div>
  )
}
