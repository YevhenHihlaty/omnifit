import { beforeEach, describe, expect, it, vi } from "vitest"
import { listClientCoachesForUser } from "./list-client-coaches"
import { clientLeaveCoach } from "./client-leave-coach"

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect")
  }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
    rpc,
  })),
}))

describe("listClientCoachesForUser", () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it("maps coach rows", async () => {
    rpc.mockResolvedValue({
      data: {
        success: true,
        coaches: [
          {
            relationship_id: "r1",
            coach_id: "c1",
            display_name: "Coach A",
            since: "2026-01-01T00:00:00Z",
          },
        ],
      },
      error: null,
    })

    await expect(listClientCoachesForUser()).resolves.toEqual([
      {
        relationshipId: "r1",
        coachId: "c1",
        displayName: "Coach A",
        since: "2026-01-01T00:00:00Z",
      },
    ])
  })

  it("returns empty on failure", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } })
    await expect(listClientCoachesForUser()).resolves.toEqual([])
  })
})

describe("clientLeaveCoach", () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
  })

  it("leaves via RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "client-1" } } })
    rpc.mockResolvedValue({ data: { success: true, status: "archived" }, error: null })

    await expect(clientLeaveCoach("coach-1")).resolves.toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith("client_leave_coach", { p_coach_id: "coach-1" })
  })

  it("surfaces errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "client-1" } } })
    rpc.mockResolvedValue({
      data: { success: false, error: "not_found" },
      error: null,
    })

    await expect(clientLeaveCoach("missing")).resolves.toEqual({
      success: false,
      error: "not_found",
    })
  })
})
