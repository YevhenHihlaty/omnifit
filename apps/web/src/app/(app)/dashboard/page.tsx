import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { CoachDashboardView } from "@/features/coach-home/CoachDashboardView"
import {
  buildClientInviteDialogLabels,
  buildPendingInvitesListLabels,
} from "@/features/client-invite/labels"
import {
  getCoachRosterUsage,
  listPendingClientInvites,
} from "@/features/client-invite/queries"
import { getCoachDashboardSummary } from "@/features/coach-home/queries"
import { listCoachClients } from "@/features/coach-clients/queries"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatMessagePreview } from "@/features/messaging/format-message-preview"
import type { ListConversationInboxRpcResult } from "@/features/messaging/types"
import type { Metadata } from "next"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("meta.dashboard") }
}

export default async function DashboardPage() {
  const { t } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()

  const [invites, roster, summary, clients, profileResult, inboxResult] = await Promise.all([
    listPendingClientInvites(),
    getCoachRosterUsage(),
    getCoachDashboardSummary(),
    listCoachClients({ status: "active" }),
    supabase.from("coach_profiles").select("display_name").limit(1).maybeSingle(),
    supabase.rpc("list_conversation_inbox"),
  ])

  const canInvite = roster?.canInvite === true
  const displayName = profileResult.data?.display_name ?? undefined

  const inboxPayload = inboxResult.data as ListConversationInboxRpcResult | null
  const recentMessages = (inboxPayload?.items ?? [])
    .filter((item) => item.last_message_body)
    .slice(0, 3)
    .map((item) => ({
      id: item.conversation_id,
      senderName: item.counterpart_name ?? "",
      preview: formatMessagePreview(item.last_message_body, ""),
    }))

  return (
    <CoachDashboardView
      canInvite={canInvite}
      roster={roster}
      pendingInvites={invites}
      summary={summary}
      clients={clients}
      displayName={displayName}
      recentMessages={recentMessages}
      inviteLabels={buildClientInviteDialogLabels(t)}
      pendingLabels={buildPendingInvitesListLabels(t)}
      labels={{
        title: t("dashboard.title"),
        subtitle: t("dashboard.subtitle"),
        greetingMorning: t("dashboard.greetingMorning"),
        greetingAfternoon: t("dashboard.greetingAfternoon"),
        greetingEvening: t("dashboard.greetingEvening"),
        clients: {
          title: t("dashboard.clients.title"),
          description: t("dashboard.clients.description"),
        },
        sessions: {
          title: t("dashboard.sessions.title"),
          description: t("dashboard.sessions.description"),
        },
        checkIns: {
          title: t("dashboard.checkIns.title"),
          description: t("dashboard.checkIns.description"),
        },
        activity: {
          title: t("dashboard.activity.title"),
          description: t("dashboard.activity.description"),
        },
        scheduleSession: t("dashboard.scheduleSession"),
        scheduleComingSoon: t("dashboard.scheduleComingSoon"),
        calendarSchedule: t("dashboard.calendarSchedule"),
        calendarPrev: t("dashboard.calendarPrev"),
        calendarNext: t("dashboard.calendarNext"),
        recentMessagesTitle: t("dashboard.recentMessagesTitle"),
        recentMessagesOpenInbox: t("dashboard.recentMessagesOpenInbox"),
        rosterUnavailable: t("clientInvite.errors.rosterUnavailable"),
        usage: t("clientInvite.roster.usage"),
        usageUnlimited: t("clientInvite.roster.usageUnlimited"),
        upgrade: t("clientInvite.roster.upgrade"),
        live: {
          activeClients: t("dashboard.live.activeClients"),
          sessionsLast30: t("dashboard.live.sessionsLast30"),
          avgStreak: t("dashboard.live.avgStreak"),
          streakDaysSuffix: t("dashboard.live.streakDaysSuffix"),
          chartTitle: t("dashboard.live.chartTitle"),
          chartThisWeek: t("dashboard.live.chartThisWeek"),
          chartLastWeek: t("dashboard.live.chartLastWeek"),
          chartAriaLabel: t("dashboard.live.chartAriaLabel"),
          chartDays: [
            t("dashboard.live.dayMon"),
            t("dashboard.live.dayTue"),
            t("dashboard.live.dayWed"),
            t("dashboard.live.dayThu"),
            t("dashboard.live.dayFri"),
            t("dashboard.live.daySat"),
            t("dashboard.live.daySun"),
          ] as [string, string, string, string, string, string, string],
          donutTitle: t("dashboard.live.donutTitle"),
          donutSubtitle: t("dashboard.live.donutSubtitle"),
          donutOnTrack: t("dashboard.live.donutOnTrack"),
          donutAtRisk: t("dashboard.live.donutAtRisk"),
          donutNew: t("dashboard.live.donutNew"),
          donutClients: t("dashboard.live.donutClients"),
          todayTitle: t("dashboard.live.todayTitle"),
          todayEmpty: t("dashboard.live.todayEmpty"),
          todayStatusDone: t("dashboard.live.todayStatusDone"),
          todayStatusCompleted: t("dashboard.live.todayStatusCompleted"),
          todayStatusInProgress: t("dashboard.live.todayStatusInProgress"),
          todayStatusUpcoming: t("dashboard.live.todayStatusUpcoming"),
          todayStatusScheduled: t("dashboard.live.todayStatusScheduled"),
          viewClients: t("dashboard.live.viewClients"),
          viewAtRisk: t("dashboard.live.viewAtRisk"),
          loadError: t("dashboard.live.loadError"),
          clientsStripTitle: t("dashboard.live.clientsStripTitle"),
          clientsStripColClient: t("dashboard.live.clientsStripColClient"),
          clientsStripColLastCheckin: t("dashboard.live.clientsStripColLastCheckin"),
          clientsStripColStatus: t("dashboard.live.clientsStripColStatus"),
          clientsStripEmpty: t("dashboard.live.clientsStripEmpty"),
          filterAll: t("coachClients.filterAll"),
          filterAttention: t("coachClients.filterAttention"),
          relativeToday: t("coachClients.relative.today"),
          relativeYesterday: t("coachClients.relative.yesterday"),
          relativeDaysAgo: t("coachClients.relative.daysAgo"),
        },
      }}
    />
  )
}
