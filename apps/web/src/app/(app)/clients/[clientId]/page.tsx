import { headers } from "next/headers"
import type { ReactNode } from "react"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { getCoachClientSnapshot } from "@/features/coach-clients/queries"
import {
  buildCoachAnalyticsUiLabels,
  buildCoachHistoryUiLabels,
  buildHistoryMapperLabels,
  buildSnapshotLabels,
} from "@/features/coach-clients/labels"
import {
  ClientDetailTabs,
  type ClientDetailTab,
} from "@/features/coach-clients/ClientDetailTabs"
import { ClientSnapshotView } from "@/features/coach-clients/ClientSnapshotView"
import { ClientHistoryView } from "@/features/coach-clients/ClientHistoryView"
import { ClientAnalyticsView } from "@/features/coach-clients/ClientAnalyticsView"
import { ClientDetailActions } from "@/features/coach-clients/ClientDetailActions"
import { ClientProgramsPanel } from "@/features/coach-clients/ClientProgramsPanel"
import { CoachNotesView } from "@/features/coach-notes/CoachNotesView"
import {
  listCoachNotesForClient,
  listNoteClientOptions,
} from "@/features/coach-notes/queries"
import { getCoachNutritionTarget } from "@/features/coach-clients/get-coach-nutrition-target"
import {
  loadCoachClientAnalytics,
  loadCoachClientHistory,
  type HistoryRangeDays,
} from "@/features/coach-clients/history-analytics-queries"
import {
  buildActivitySubtitle,
  BUCKET_VARIANTS,
} from "@/features/coach-clients/client-status"
import { Avatar, StatusPill } from "@omnifit/ui"
import Link from "next/link"
import { ROUTES, coachClientDetail } from "@/lib/routes"
import { ChevronLeft } from "lucide-react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type Props = {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ tab?: string; range?: string }>
}

const requestTimeZone = async (): Promise<string> => {
  const h = await headers()
  return h.get("x-vercel-ip-timezone") || "UTC"
}

const parseTab = (raw: string | undefined): ClientDetailTab => {
  if (raw === "history" || raw === "analytics" || raw === "notes" || raw === "programs") return raw
  return "snapshot"
}

const parseRange = (raw: string | undefined): HistoryRangeDays => {
  if (raw === "7" || raw === "90") return Number(raw) as HistoryRangeDays
  return 30
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  const { clientId } = await params
  const tz = await requestTimeZone()
  const result = await getCoachClientSnapshot(clientId, tz)
  if (!result.success) return { title: t("meta.clients") }
  return { title: result.snapshot.client.displayName }
}

export default async function CoachClientDetailPage({
  params,
  searchParams,
}: Props) {
  const { t, locale } = await getServerTranslator()
  const { clientId } = await params
  const { tab: tabRaw, range: rangeRaw } = await searchParams
  const activeTab = parseTab(tabRaw)
  const rangeDays = parseRange(rangeRaw)
  const tz = await requestTimeZone()

  const snapshotLabels = buildSnapshotLabels(t)
  const tVars = (key: string, vars?: Record<string, string | number>) => {
    const base = t(key)
    if (!vars) return base
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      base
    )
  }
  const [result, nutrition, relationshipId] = await Promise.all([
    getCoachClientSnapshot(clientId, tz),
    getCoachNutritionTarget(clientId),
    (async () => {
      const supabase = await createSupabaseServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from("coach_client_relationships")
        .select("id")
        .eq("coach_id", user.id)
        .eq("client_id", clientId)
        .in("status", ["active", "archived"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.id ?? null
    })(),
  ])

  if (!result.success) {
    if (result.error === "forbidden" || result.error === "not_found") {
      notFound()
    }
    return (
      <div className="px-6 py-12 text-center text-sm text-ink-500">
        {t("coachClients.actionError")}
      </div>
    )
  }

  const { client, habits, calories, checkins, recentActivity } = result.snapshot
  const comingSoon = t("shell.comingSoon")
  const bucket = client.statusBucket
  const bucketLabel = bucket
    ? {
        on_track: snapshotLabels.bucketOnTrack,
        at_risk: snapshotLabels.bucketAtRisk,
        new: snapshotLabels.bucketNew,
      }[bucket]
    : null
  const bucketVariant = bucket ? BUCKET_VARIANTS[bucket] : "inactive"
  const todayIso = new Date().toISOString().slice(0, 10)
  const lastCheckinOn =
    checkins.find((c) => c.present)?.weekStart ?? null
  const lastLogOn = recentActivity[0]?.at?.slice(0, 10) ?? null
  const activityLine = buildActivitySubtitle({
    caloriesToday: calories.consumedKcal,
    workoutsToday: recentActivity.filter(
      (a) => a.kind === "workout" && a.at.slice(0, 10) === todayIso
    ).length,
    lastCheckinOn,
    lastLogOn,
    todayIso,
    statusBucket: client.statusBucket,
    since: client.since,
    t: tVars,
  })
  const headerSubtitle = [client.goal, activityLine].filter(Boolean).join(" · ")

  let historyPanel: ReactNode = null
  let analyticsPanel: ReactNode = null
  let notesPanel: ReactNode = null

  if (activeTab === "history") {
    const history = await loadCoachClientHistory(
      clientId,
      buildHistoryMapperLabels(t),
      "all",
      rangeDays
    )
    if ("error" in history) {
      historyPanel = (
        <p className="text-sm text-danger" role="alert">
          {t("coachHistory.loadFailed")}
        </p>
      )
    } else {
      historyPanel = (
        <ClientHistoryView
          groups={history.data.groups}
          labels={buildCoachHistoryUiLabels(t)}
          loadFailed={history.loadFailed}
          rangeDays={rangeDays}
          rangeHref={(days) =>
            `${coachClientDetail(clientId)}?tab=history&range=${days}`
          }
        />
      )
    }
  }

  if (activeTab === "analytics") {
    const analytics = await loadCoachClientAnalytics(clientId)
    if ("error" in analytics) {
      analyticsPanel = (
        <p className="text-sm text-danger" role="alert">
          {t("coachAnalytics.loadFailed")}
        </p>
      )
    } else {
      analyticsPanel = (
        <ClientAnalyticsView
          data={analytics.data}
          labels={buildCoachAnalyticsUiLabels(t)}
          loadFailed={analytics.loadFailed}
        />
      )
    }
  }

  if (activeTab === "notes") {
    const [noteResult, noteClients] = await Promise.all([
      listCoachNotesForClient(clientId),
      listNoteClientOptions(),
    ])
    notesPanel = (
      <CoachNotesView
        notes={noteResult.notes}
        clients={noteClients}
        locale={locale}
        loadFailed={noteResult.loadFailed}
        labels={{
          title: t("notes.title"),
          subtitle: t("notes.subtitle"),
          newNote: t("notes.newNote"),
          searchPlaceholder: t("notes.searchPlaceholder"),
          editorCaption: t("notes.editorCaption"),
          editorNew: t("notes.editorNew"),
          editorEdit: t("notes.editorEdit"),
          emptyTitle: t("notes.emptyTitle"),
          emptyBody: t("notes.emptyBody"),
          emptyCta: t("notes.emptyCta"),
          searchEmpty: t("notes.searchEmpty"),
          loadFailed: t("notes.loadFailed"),
          titleLabel: t("notes.titleLabel"),
          titlePlaceholder: t("notes.titlePlaceholder"),
          bodyLabel: t("notes.bodyLabel"),
          bodyPlaceholder: t("notes.bodyPlaceholder"),
          clientLabel: t("notes.clientLabel"),
          clientNone: t("notes.clientNone"),
          save: t("notes.save"),
          saving: t("notes.saving"),
          discard: t("notes.discard"),
          delete: t("notes.delete"),
          errors: {
            title_required: t("notes.errors.title_required"),
            body_too_long: t("notes.errors.body_too_long"),
            not_authenticated: t("notes.errors.not_authenticated"),
            create_failed: t("notes.errors.create_failed"),
            update_failed: t("notes.errors.update_failed"),
            delete_failed: t("notes.errors.delete_failed"),
            not_found: t("notes.errors.not_found"),
          },
        }}
      />
    )
  }

  return (
    <div className="flex flex-col">
      <Link
        href={ROUTES.clients}
        className="mb-4 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {snapshotLabels.backToRoster}
      </Link>

      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={client.displayName} src={client.avatarUrl} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-bold text-ink-900 sm:text-[22px]">
                {client.displayName}
              </h1>
              {bucketLabel ? (
                <StatusPill variant={bucketVariant} label={bucketLabel} />
              ) : null}
            </div>
            <p className="mt-1 text-[13.5px] text-ink-500">
              {headerSubtitle}
            </p>
          </div>
        </div>
        <ClientDetailActions
          clientId={clientId}
          relationshipId={relationshipId}
          messageLabel={t("coachClients.preview.message")}
          editPlanLabel={t("snapshot.editPlan")}
          logWorkoutLabel={t("coachClients.logWorkout")}
          comingSoon={comingSoon}
          initialCalories={nutrition?.caloriesKcal ?? calories.targetKcal}
          initialProtein={nutrition?.proteinG ?? null}
          initialCarbs={nutrition?.carbsG ?? null}
          initialFat={nutrition?.fatG ?? null}
          habits={habits.map((h) => ({
            habitId: h.habitId,
            title: h.title,
            targetValue: h.targetValue,
            unit: h.unit,
            unitLabel: h.unitLabel ?? null,
            currentValue: h.currentValue,
            done: h.done,
          }))}
          planLabels={{
            title: t("planEditor.title"),
            nutritionTitle: t("planEditor.nutritionTitle"),
            caloriesLabel: t("planEditor.caloriesLabel"),
            proteinLabel: t("planEditor.proteinLabel"),
            carbsLabel: t("planEditor.carbsLabel"),
            fatLabel: t("planEditor.fatLabel"),
            saveTarget: t("planEditor.saveTarget"),
            saving: t("planEditor.saving"),
            habitsTitle: t("planEditor.habitsTitle"),
            habitTitleLabel: t("planEditor.habitTitleLabel"),
            habitTargetLabel: t("planEditor.habitTargetLabel"),
            habitUnitLabel: t("planEditor.habitUnitLabel"),
            habitUnitLabelHint: t("planEditor.habitUnitLabelHint"),
            unitCount: t("planEditor.unitCount"),
            unitMinutes: t("planEditor.unitMinutes"),
            unitLiters: t("planEditor.unitLiters"),
            unitBoolean: t("planEditor.unitBoolean"),
            addHabit: t("planEditor.addHabit"),
            adding: t("planEditor.adding"),
            archive: t("planEditor.archive"),
            archiving: t("planEditor.archiving"),
            emptyHabits: t("planEditor.emptyHabits"),
            success: t("planEditor.success"),
            error: t("planEditor.error"),
            close: t("planEditor.close"),
          }}
        />
      </div>

      <div className="mt-4">
        <ClientDetailTabs
          clientId={clientId}
          activeTab={activeTab}
          labels={snapshotLabels}
          relationshipId={relationshipId}
        />
      </div>

      <div className="mt-7">
        {activeTab === "snapshot" ? (
          <ClientSnapshotView
            snapshot={result.snapshot}
            labels={snapshotLabels}
            hideClientHeader
            locale={locale}
          />
        ) : null}
        {activeTab === "programs" ? (
          <ClientProgramsPanel
            labels={{
              programsEmpty: snapshotLabels.programsEmpty,
              programsEmptyBody: snapshotLabels.programsEmptyBody,
              programsViewLibrary: snapshotLabels.programsViewLibrary,
            }}
          />
        ) : null}
        {activeTab === "history" ? historyPanel : null}
        {activeTab === "analytics" ? analyticsPanel : null}
        {activeTab === "notes" ? notesPanel : null}
      </div>
    </div>
  )
}
