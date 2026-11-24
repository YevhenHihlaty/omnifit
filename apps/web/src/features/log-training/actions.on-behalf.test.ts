import { describe, expect, it, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRevalidatePath = vi.fn()
const mockRedirect = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import { saveWorkout } from "./actions"

describe("saveWorkout onBehalfOf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
  })

  it("rejects when coach has no active relationship", async () => {
    mockFrom.mockImplementation(() => {
      const api: Record<string, unknown> = {}
      const self = () => api
      api.select = vi.fn(self)
      api.eq = vi.fn(self)
      api.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      return api
    })

    const result = await saveWorkout({
      sportType: "weight_lifting",
      durationMinutes: 30,
      sets: [
        {
          exercise_name: "Squat",
          sort_order: 0,
          reps: 5,
          weight_kg: 100,
        },
      ],
      onBehalfOf: "client-1",
    })

    expect(result).toEqual({ success: false, error: "forbidden" })
  })

  it("inserts coach_offline workout for an active client", async () => {
    const workoutInserts: unknown[] = []

    mockFrom.mockImplementation((table: string) => {
      const api: Record<string, unknown> = {}
      const self = () => api
      api.select = vi.fn(self)
      api.eq = vi.fn(self)
      api.delete = vi.fn(self)

      if (table === "coach_client_relationships") {
        api.maybeSingle = vi.fn(async () => ({
          data: { id: "rel-1" },
          error: null,
        }))
        return api
      }

      if (table === "workouts") {
        api.insert = vi.fn((row: unknown) => {
          workoutInserts.push(row)
          return api
        })
        api.single = vi.fn(async () => ({ data: { id: "w-1" }, error: null }))
        return api
      }

      if (table === "workout_sets") {
        api.insert = vi.fn(async () => ({ data: null, error: null }))
        return api
      }

      api.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      api.single = vi.fn(async () => ({ data: null, error: null }))
      api.insert = vi.fn(self)
      return api
    })

    const result = await saveWorkout({
      sportType: "weight_lifting",
      durationMinutes: 40,
      sets: [
        {
          exercise_name: "Squat",
          sort_order: 0,
          reps: 5,
          weight_kg: 100,
        },
      ],
      onBehalfOf: "client-1",
    })

    expect(result.success).toBe(true)
    expect(workoutInserts[0]).toMatchObject({
      client_id: "client-1",
      logged_by_id: "coach-1",
      source: "coach_offline",
    })
  })
})
