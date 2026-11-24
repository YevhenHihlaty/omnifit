import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CoachDashboardView } from "./CoachDashboardView"
import type { CoachDashboardSummary } from "./queries"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock("@/lib/i18n/locale-store", () => ({
  useLocale: () => ({ locale: "en", setLocale: vi.fn() }),
}))

const inviteLabels = {
  inviteCta: "Invite a client",
  dialogTitle: "Invite",
  dialogSubtitle: "Send a secure link",
  emailLabel: "Email",
  inlineEmailLabel: "Invite a client by email",
  sendCta: "Send",
  sendingCta: "Sending",
  cancelCta: "Cancel",
  successMessage: "Sent to {email}",
  capMessage: "Client limit reached",
  errorGeneric: "Error",
  errorPending: "Pending",
  errorCoachEmail: "Coach email",
  errorOnRoster: "On roster",
  errorRosterLimit: "Limit",
}

const pendingLabels = {
  title: "Pending invites",
  empty: "None",
  emptyHint: "Send an invite",
  pendingChip: "Pending",
  resend: "Resend",
  revoke: "Revoke",
  resending: "Resending",
  revoking: "Revoking",
  sent: "Sent",
  actionError: "Failed",
  resendSuccess: "Resent",
  revokeSuccess: "Revoked",
  colEmail: "Email",
  colStatus: "Status",
  colActions: "Actions",
}

const liveLabels = {
  activeClients: "Active clients",
  sessionsLast30: "Sessions, last 30 days",
  avgStreak: "Avg. client streak",
  streakDaysSuffix: "days",
  chartTitle: "Check-in activity",
  chartThisWeek: "This week",
  chartLastWeek: "Last week",
  chartAriaLabel: "Check-in activity chart comparing this week vs last week",
  chartDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ],
  donutTitle: "Client status",
  donutSubtitle: "Based on check-in recency",
  donutOnTrack: "On track",
  donutAtRisk: "At risk",
  donutNew: "New",
  donutClients: "clients",
  todayTitle: "Today's schedule",
  todayEmpty: "No sessions scheduled for today.",
  todayStatusDone: "Done",
  todayStatusCompleted: "Done",
  todayStatusInProgress: "Now",
  todayStatusUpcoming: "Next",
  todayStatusScheduled: "Next",
  viewClients: "View all clients",
  viewAtRisk: "View clients at risk →",
  loadError: "Couldn't load dashboard data.",
  clientsStripTitle: "Your clients",
  clientsStripColClient: "Client",
  clientsStripColLastCheckin: "Last check-in",
  clientsStripColStatus: "Status",
  clientsStripEmpty: "No active clients yet.",
  filterAll: "All",
  filterAttention: "Needs attention",
  relativeToday: "Today",
  relativeYesterday: "Yesterday",
  relativeDaysAgo: "{days} days ago",
}

const defaultLabels = {
  title: "Dashboard",
  subtitle: "Welcome to OmniFit.",
  clients: { title: "No clients yet", description: "Invite your first client." },
  sessions: { title: "No sessions scheduled", description: "Sessions will appear here." },
  checkIns: { title: "No check-ins", description: "Check-ins will appear here." },
  activity: { title: "No recent activity", description: "Activity will appear here." },
  scheduleSession: "Schedule a session",
  scheduleComingSoon: "Coming later",
  rosterUnavailable: "Roster unavailable",
  usage: "{active} of {limit} client slots used on the Free plan",
  usageUnlimited: "{active} active clients",
  upgrade: "Upgrade to Pro for unlimited clients",
  live: liveLabels,
}

const freeRoster = {
  activeCount: 1,
  limit: 3 as number | null,
  tier: "free" as const,
  canInvite: true,
}

const makeSummary = (overrides?: Partial<CoachDashboardSummary>): CoachDashboardSummary => ({
  activeClients: 5,
  sessionsLast30: 12,
  avgStreakDays: 8,
  checkinActivity: {
    thisWeek: [2, 3, 5, 4, 6, 7, 1],
    lastWeek: [1, 2, 3, 3, 4, 5, 2],
  },
  statusCounts: { onTrack: 3, atRisk: 1, new: 1 },
  todaySessions: [],
  ...overrides,
})

describe("CoachDashboardView — empty state", () => {
  it("renders enabled invite when canInvite", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={null}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByRole("button", { name: "Invite a client" })).toBeEnabled()
  })

  it("disables invite when roster cap reached", () => {
    render(
      <CoachDashboardView
        canInvite={false}
        roster={{ ...freeRoster, activeCount: 3, canInvite: false }}
        pendingInvites={[]}
        summary={null}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByRole("button", { name: "Invite a client" })).toBeDisabled()
    expect(screen.getByText("Client limit reached")).toBeInTheDocument()
  })

  it("shows roster unavailable when roster is null", () => {
    render(
      <CoachDashboardView
        canInvite={false}
        roster={null}
        pendingInvites={[]}
        summary={null}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Roster unavailable")).toBeInTheDocument()
    expect(screen.queryByText("Client limit reached")).not.toBeInTheDocument()
  })

  it("shows empty-state tiles when summary is null", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={null}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("No clients yet")).toBeInTheDocument()
    expect(screen.queryByText("Active clients")).not.toBeInTheDocument()
  })

  it("shows empty-state tiles when activeClients is 0", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary({ activeClients: 0 })}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("No clients yet")).toBeInTheDocument()
  })

  it("shows error banner when summary is false", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={false}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load dashboard data.")
  })
})

describe("CoachDashboardView — live dashboard", () => {
  it("shows stat tiles when summary has active clients", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Active clients")).toBeInTheDocument()
    expect(screen.getByText("Sessions, last 30 days")).toBeInTheDocument()
    expect(screen.getByText("Avg. client streak")).toBeInTheDocument()
  })

  it("does not show empty-state tiles when live", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.queryByText("No clients yet")).not.toBeInTheDocument()
  })

  it("renders check-in activity chart heading", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Check-in activity")).toBeInTheDocument()
  })

  it("renders donut chart heading", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Client status")).toBeInTheDocument()
  })

  it("renders today's schedule heading", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Today's schedule")).toBeInTheDocument()
  })

  it("shows empty schedule message when no today sessions", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary({ todaySessions: [] })}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("No sessions scheduled for today.")).toBeInTheDocument()
  })

  it("renders today sessions when present", () => {
    const summary = makeSummary({
      todaySessions: [
        {
          id: "s1",
          clientId: "c1",
          clientName: "Alex Romero",
          title: "Strength",
          startsAt: new Date(Date.now()).toISOString(),
          durationMinutes: 45,
          status: "upcoming",
        },
      ],
    })
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={summary}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText(/Strength · Alex Romero/)).toBeInTheDocument()
  })

  it("shows clients strip and view-all link when live", () => {
    render(
      <CoachDashboardView
        canInvite
        roster={freeRoster}
        pendingInvites={[]}
        summary={makeSummary()}
        clients={[]}
        inviteLabels={inviteLabels}
        pendingLabels={pendingLabels}
        labels={defaultLabels}
      />
    )
    expect(screen.getByText("Your clients")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View all clients/i })).toBeInTheDocument()
  })
})

describe("dashboard-tiles shouldShowLiveDashboard", () => {
  it("returns false for null summary", async () => {
    const { shouldShowLiveDashboard } = await import("./dashboard-tiles")
    expect(shouldShowLiveDashboard(null)).toBe(false)
  })

  it("returns false for zero activeClients", async () => {
    const { shouldShowLiveDashboard } = await import("./dashboard-tiles")
    expect(shouldShowLiveDashboard(makeSummary({ activeClients: 0 }))).toBe(false)
  })

  it("returns true when activeClients > 0", async () => {
    const { shouldShowLiveDashboard } = await import("./dashboard-tiles")
    expect(shouldShowLiveDashboard(makeSummary({ activeClients: 3 }))).toBe(true)
  })
})
