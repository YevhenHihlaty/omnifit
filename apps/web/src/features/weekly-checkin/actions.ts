"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import { weeklyCheckinSchema } from "./schemas"

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export const upsertWeeklyCheckin = async (input: {
  weekStart: string
  sleep: number
  soreness: number
  stress: number
  energy: number
  motivation: number
  notes?: string
}): Promise<ActionResult> => {
  const parsed = weeklyCheckinSchema.safeParse({
    week_start: input.weekStart,
    sleep: input.sleep,
    soreness: input.soreness,
    stress: input.stress,
    energy: input.energy,
    motivation: input.motivation,
    notes: input.notes,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { error } = await supabase.from("weekly_checkins").upsert(
    {
      client_id: user.id,
      week_start: parsed.data.week_start,
      sleep: parsed.data.sleep,
      soreness: parsed.data.soreness,
      stress: parsed.data.stress,
      energy: parsed.data.energy,
      motivation: parsed.data.motivation,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "client_id,week_start" }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.clientCheckin)
  revalidatePath(ROUTES.clientProgress)
  return { success: true }
}
