"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export type TaskActionResult =
  | { success: true; taskId?: string }
  | { success: false; error: string }

export const createCoachTask = async (input: {
  title: string
  dueAt?: string | null
  clientId?: string | null
  notes?: string | null
  taskType?: string | null
}): Promise<TaskActionResult> => {
  const title = input.title.trim()
  if (!title) return { success: false, error: "title_required" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      coach_id: user.id,
      title,
      // ponytail: noon UTC so date-only inputs don't flip calendar day across TZ
      due_at: input.dueAt?.trim()
        ? `${input.dueAt.trim()}T12:00:00.000Z`
        : null,
      client_id: input.clientId?.trim() ? input.clientId : null,
      notes: input.notes?.trim() || null,
      task_type: input.taskType?.trim() || null,
      status: "todo",
    })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: "create_failed" }
  revalidatePath(ROUTES.tasks)
  return { success: true, taskId: data.id }
}

export const updateCoachTask = async (input: {
  taskId: string
  title: string
  dueAt?: string | null
  clientId?: string | null
  notes?: string | null
  taskType?: string | null
}): Promise<TaskActionResult> => {
  const title = input.title.trim()
  if (!input.taskId.trim()) return { success: false, error: "not_found" }
  if (!title) return { success: false, error: "title_required" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title,
      due_at: input.dueAt?.trim()
        ? `${input.dueAt.trim()}T12:00:00.000Z`
        : null,
      client_id: input.clientId?.trim() ? input.clientId : null,
      notes: input.notes?.trim() || null,
      task_type: input.taskType?.trim() || null,
    })
    .eq("id", input.taskId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "update_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidatePath(ROUTES.tasks)
  return { success: true, taskId: data.id }
}

export const setCoachTaskStatus = async (
  taskId: string,
  status: "todo" | "done"
): Promise<TaskActionResult> => {
  if (!taskId.trim()) return { success: false, error: "not_found" }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "update_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidatePath(ROUTES.tasks)
  return { success: true, taskId }
}

export const deleteCoachTask = async (
  taskId: string
): Promise<TaskActionResult> => {
  if (!taskId.trim()) return { success: false, error: "not_found" }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "delete_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidatePath(ROUTES.tasks)
  return { success: true, taskId }
}
