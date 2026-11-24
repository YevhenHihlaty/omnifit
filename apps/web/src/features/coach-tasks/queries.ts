"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { mapTaskRow, type ClientOption, type CoachTask } from "./types"

const TASK_SELECT = `
  id,
  title,
  status,
  due_at,
  client_id,
  notes,
  task_type,
  client:profiles!tasks_client_id_fkey(display_name)
`

export const listCoachTasks = async (): Promise<{
  tasks: CoachTask[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { tasks: [], loadFailed: false }

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("coach_id", user.id)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) return { tasks: [], loadFailed: true }
  return {
    tasks: (data ?? []).map((row) => mapTaskRow(row as Parameters<typeof mapTaskRow>[0])),
    loadFailed: false,
  }
}

export const listTaskClientOptions = async (): Promise<ClientOption[]> => {
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
    .filter((o): o is ClientOption => o !== null)
}
