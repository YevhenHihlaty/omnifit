import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { CoachTasksView } from "@/features/coach-tasks/CoachTasksView"
import {
  listCoachTasks,
  listTaskClientOptions,
} from "@/features/coach-tasks/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("tasks.title") }
}

export default async function CoachTasksPage() {
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const [taskResult, clients] = await Promise.all([
    listCoachTasks(),
    listTaskClientOptions(),
  ])

  return (
    <CoachTasksView
      tasks={taskResult.tasks}
      clients={clients}
      locale={locale}
      loadFailed={taskResult.loadFailed}
      labels={{
        title: t("tasks.title"),
        subtitle: t("tasks.subtitle"),
        newTask: t("tasks.newTask"),
        panelNew: t("tasks.panelNew"),
        panelEdit: t("tasks.panelEdit"),
        panelCaption: t("tasks.panelCaption"),
        tabAll: t("tasks.tabAll"),
        tabTodo: t("tasks.tabTodo"),
        tabDone: t("tasks.tabDone"),
        emptyTitle: t("tasks.emptyTitle"),
        emptyBody: t("tasks.emptyBody"),
        emptyCta: t("tasks.emptyCta"),
        loadFailed: t("tasks.loadFailed"),
        titleLabel: t("tasks.titleLabel"),
        titlePlaceholder: t("tasks.titlePlaceholder"),
        dueLabel: t("tasks.dueLabel"),
        typeLabel: t("tasks.typeLabel"),
        typeOptions: [
          { value: "follow-up", label: t("tasks.typeFollowUp") },
          { value: "check-in", label: t("tasks.typeCheckin") },
          { value: "admin", label: t("tasks.typeAdmin") },
          { value: "billing", label: t("tasks.typeBilling") },
        ],
        notesLabel: t("tasks.notesLabel"),
        notesPlaceholder: t("tasks.notesPlaceholder"),
        clientLabel: t("tasks.clientLabel"),
        clientNone: t("tasks.clientNone"),
        save: t("tasks.save"),
        saving: t("tasks.saving"),
        cancel: t("tasks.cancel"),
        markDone: t("tasks.markDone"),
        markTodo: t("tasks.markTodo"),
        delete: t("tasks.delete"),
        edit: t("tasks.edit"),
        moreOptions: t("tasks.moreOptions"),
        statusTodo: t("tasks.statusTodo"),
        statusDone: t("tasks.statusDone"),
        errors: {
          title_required: t("tasks.errors.title_required"),
          not_authenticated: t("tasks.errors.not_authenticated"),
          create_failed: t("tasks.errors.create_failed"),
          update_failed: t("tasks.errors.update_failed"),
          delete_failed: t("tasks.errors.delete_failed"),
          not_found: t("tasks.errors.not_found"),
        },
      }}
    />
  )
}
