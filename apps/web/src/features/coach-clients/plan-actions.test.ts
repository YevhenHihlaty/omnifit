import { describe, expect, it, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()
const mockUpsert = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === "client_nutrition_targets") {
        return { upsert: mockUpsert }
      }
      if (table === "daily_habits") {
        return {
          insert: (row: unknown) => {
            mockInsert(row)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: { id: "habit-1" }, error: null }),
              }),
            }
          },
          update: (payload: unknown, opts?: unknown) => {
            mockUpdate(payload, opts)
            return {
              eq: () => ({
                eq: async () => ({ error: null, count: 1 }),
              }),
            }
          },
        }
      }
      return {}
    },
  }),
}))

describe("plan-actions coach isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: "coach-a" } } })
    mockUpsert.mockResolvedValue({ error: null })
  })

  it("upserts nutrition target with coach_id = auth user only", async () => {
    const { upsertClientNutritionTarget } = await import("./plan-actions")
    const result = await upsertClientNutritionTarget({
      clientId: "client-1",
      caloriesKcal: 2100,
      proteinG: 140,
    })
    expect(result.success).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        coach_id: "coach-a",
        calories_kcal: 2100,
      }),
      expect.anything()
    )
  })

  it("rejects invalid calories", async () => {
    const { upsertClientNutritionTarget } = await import("./plan-actions")
    const result = await upsertClientNutritionTarget({
      clientId: "client-1",
      caloriesKcal: 0,
    })
    expect(result.success).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("creates habit with coach_id = auth user", async () => {
    const { createDailyHabit } = await import("./plan-actions")
    const result = await createDailyHabit({
      clientId: "client-1",
      title: "Drink water",
      targetValue: 2,
      unit: "liters",
    })
    expect(result.success).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        coach_id: "coach-a",
        title: "Drink water",
      })
    )
  })
})
