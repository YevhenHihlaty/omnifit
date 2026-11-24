import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { CoachNotesView } from "@/features/coach-notes/CoachNotesView"
import {
  listCoachNotes,
  listNoteClientOptions,
} from "@/features/coach-notes/queries"

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getServerTranslator()
  return { title: t("notes.title") }
}

export default async function CoachNotesPage() {
  const { t, locale } = await getServerTranslator()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const [noteResult, clients] = await Promise.all([
    listCoachNotes(),
    listNoteClientOptions(),
  ])

  return (
    <CoachNotesView
      notes={noteResult.notes}
      clients={clients}
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
