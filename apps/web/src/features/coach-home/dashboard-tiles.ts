import type { CoachDashboardSummary } from "./queries"

/**
 * Returns true when the live dashboard sections should be shown.
 * Empty-state tiles show when the coach has no active clients yet, or data is unavailable.
 */
export const shouldShowLiveDashboard = (
  summary: CoachDashboardSummary | false | null
): summary is CoachDashboardSummary => summary !== null && summary !== false && summary.activeClients > 0
