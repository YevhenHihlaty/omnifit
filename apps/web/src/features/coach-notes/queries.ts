"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { mapNoteRow, type CoachNote, type NoteClientOption } from "./types"

const NOTE_SELECT = `
  id,
  title,
  body,
  kind,
  client_id,
  created_at,
  client:profiles!coach_notes_client_id_fkey(display_name)
`

export const listCoachNotes = async (): Promise<{
  notes: CoachNote[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { notes: [], loadFailed: false }

  const { data, error } = await supabase
    .from("coach_notes")
    .select(NOTE_SELECT)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return { notes: [], loadFailed: true }
  return {
    notes: (data ?? []).map((row) =>
      mapNoteRow(row as Parameters<typeof mapNoteRow>[0])
    ),
    loadFailed: false,
  }
}

export const listCoachNotesForClient = async (
  clientId: string
): Promise<{ notes: CoachNote[]; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { notes: [], loadFailed: false }

  const { data, error } = await supabase
    .from("coach_notes")
    .select(NOTE_SELECT)
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) return { notes: [], loadFailed: true }
  return {
    notes: (data ?? []).map((row) =>
      mapNoteRow(row as Parameters<typeof mapNoteRow>[0])
    ),
    loadFailed: false,
  }
}

export const listNoteClientOptions = async (): Promise<NoteClientOption[]> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("coach_client_relationships")
    .select(
      "client_id, client:profiles!coach_client_relationships_client_id_fkey(display_name)"
    )
    .eq("coach_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error || !data) return []

  return data
    .map((row) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client
      const name =
        client && typeof client === "object" && "display_name" in client
          ? String(client.display_name ?? "").trim()
          : ""
      if (!name) return null
      return { id: String(row.client_id), displayName: name }
    })
    .filter((o): o is NoteClientOption => o !== null)
}
