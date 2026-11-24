"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export type NoteActionResult =
  | { success: true; noteId?: string }
  | { success: false; error: string }

export const createCoachNote = async (input: {
  title: string
  body: string
  clientId?: string | null
}): Promise<NoteActionResult> => {
  const title = input.title.trim() || "Untitled note"
  const body = input.body.trim()
  if (body.length > 10_000) return { success: false, error: "body_too_long" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_notes")
    .insert({
      coach_id: user.id,
      title,
      body,
      client_id: input.clientId?.trim() ? input.clientId : null,
      kind: "manual",
    })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: "create_failed" }
  revalidatePath(ROUTES.notes)
  return { success: true, noteId: data.id }
}

export const updateCoachNote = async (input: {
  noteId: string
  title: string
  body: string
  clientId?: string | null
}): Promise<NoteActionResult> => {
  const title = input.title.trim() || "Untitled note"
  const body = input.body.trim()
  if (!input.noteId.trim()) return { success: false, error: "not_found" }
  if (body.length > 10_000) return { success: false, error: "body_too_long" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_notes")
    .update({
      title,
      body,
      client_id: input.clientId?.trim() ? input.clientId : null,
    })
    .eq("id", input.noteId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "update_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidatePath(ROUTES.notes)
  return { success: true, noteId: data.id }
}

export const deleteCoachNote = async (
  noteId: string
): Promise<NoteActionResult> => {
  if (!noteId.trim()) return { success: false, error: "not_found" }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_notes")
    .delete()
    .eq("id", noteId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "delete_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidatePath(ROUTES.notes)
  return { success: true, noteId }
}
