import { headers } from "next/headers"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { InlineInviteForm } from "@/features/client-invite/InlineInviteForm"
import { PendingInvitesList } from "@/features/client-invite/PendingInvitesList"
import { RosterUsageBanner } from "@/features/client-invite/RosterUsageBanner"
import {
  buildClientInviteDialogLabels,
  buildPendingInvitesListLabels,
} from "@/features/client-invite/labels"
import {
  getCoachRosterUsage,
  listPendingClientInvites,
} from "@/features/client-invite/queries"
import { listCoachClients } from "@/features/coach-clients/queries"
import { buildCoachClientsLabels } from "@/features/coach-clients/labels"
import { CoachClientsView } from "@/features/coach-clients/CoachClientsView"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import type { Metadata } from "next"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("meta.clients") }
}

type Props = {
  searchParams: Promise<{
    tab?: string
    selected?: string
    status?: string
    attention?: string
    template?: string
    createTemplate?: string
  }>
}

export default async function CoachClientsPage({ searchParams }: Props) {
  const { t } = await getServerTranslator()
  const params = await searchParams
  const tab = params.tab === "pending" ? "pending" : "active"
  const statusFilter =
    params.status === "archived" ? "archived" : ("active" as "active" | "archived")
  const attentionOnly = params.attention === "1"
  const selectedId = params.selected ?? null
  const templateId = params.template?.trim() || null
  const createTemplate = params.createTemplate === "1"
  const h = await headers()
  const tz = h.get("x-vercel-ip-timezone") || "UTC"

  const [invites, roster, clients] = await Promise.all([
    listPendingClientInvites(),
    getCoachRosterUsage(),
    listCoachClients({ status: statusFilter, tz }),
  ])

  const canInvite = roster?.canInvite === true
  const dialogLabels = buildClientInviteDialogLabels(t)
  const rosterLabels = buildCoachClientsLabels(t)

  const makeTabHref = (tabName: string) => {
    const p = new URLSearchParams()
    p.set("tab", tabName)
    return `${ROUTES.clients}?${p.toString()}`
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {rosterLabels.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {tab === "active"
            ? rosterLabels.activeCountSubtitle.replace(
                "{count}",
                String(clients.length)
              )
            : rosterLabels.pageSubtitle}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mt-6 flex gap-7 border-b border-stone-300"
        role="tablist"
        aria-label={rosterLabels.pageTitle}
      >
        <Link
          href={makeTabHref("active")}
          role="tab"
          aria-selected={tab === "active"}
          className={[
            "border-b-2 pb-3 text-sm font-semibold transition-colors",
            tab === "active"
              ? "border-pine text-pine-dark"
              : "border-transparent text-ink-500 hover:text-ink-700",
          ].join(" ")}
        >
          {rosterLabels.tabActive}
          {clients.length > 0 ? (
            <span className="ml-2 tabular-nums text-ink-500">({clients.length})</span>
          ) : null}
        </Link>
        <Link
          href={makeTabHref("pending")}
          role="tab"
          aria-selected={tab === "pending"}
          className={[
            "border-b-2 pb-3 text-sm font-semibold transition-colors",
            tab === "pending"
              ? "border-pine text-pine-dark"
              : "border-transparent text-ink-500 hover:text-ink-700",
          ].join(" ")}
        >
          {rosterLabels.tabPending}
          {invites.length > 0 ? (
            <span className="ml-2 tabular-nums text-ink-500">({invites.length})</span>
          ) : null}
        </Link>
      </div>

      {/* Usage banner + invite form (always visible) */}
      <div className="mt-5">
        <RosterUsageBanner
          roster={roster}
          labels={{
            usage: t("clientInvite.roster.usage"),
            usageUnlimited: t("clientInvite.roster.usageUnlimited"),
            upgrade: t("clientInvite.roster.upgrade"),
            rosterUnavailable: t("clientInvite.errors.rosterUnavailable"),
          }}
        />
      </div>

      <div className="mt-5" id="invite-client">
        <InlineInviteForm canInvite={canInvite} labels={dialogLabels} />
      </div>

      {/* Tab panels */}
      {tab === "active" ? (
        <div className="mt-6 flex min-h-[420px] flex-1 flex-col">
          {templateId ? (
            <p
              className="mb-3 rounded-[10px] border border-pine/30 bg-pine-tint px-3.5 py-2.5 text-sm text-pine-dark"
              role="status"
            >
              {t("coachLibrary.pickClientHint")}
            </p>
          ) : null}
          {createTemplate && !templateId ? (
            <p
              className="mb-3 rounded-[10px] border border-pine/30 bg-pine-tint px-3.5 py-2.5 text-sm text-pine-dark"
              role="status"
            >
              {t("coachLibrary.createTemplateHint")}
            </p>
          ) : null}
          <CoachClientsView
            clients={clients}
            labels={rosterLabels}
            initialSelectedId={selectedId}
            statusFilter={statusFilter}
            attentionOnly={attentionOnly}
            templateId={templateId}
            logWithTemplateLabel={t("coachLibrary.logWithTemplate")}
          />
        </div>
      ) : (
        <PendingInvitesList
          invites={invites}
          labels={buildPendingInvitesListLabels(t)}
        />
      )}
    </div>
  )
}
