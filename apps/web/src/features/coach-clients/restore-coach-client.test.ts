import { beforeEach, describe, expect, it, vi } from "vitest"
import { restoreCoachClient } from "./restore-coach-client"

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("redirect") }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}))

describe("restoreCoachClient", () => {
  beforeEach(() => { getUser.mockReset(); rpc.mockReset() })

  it("restores via RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({ data: { success: true }, error: null })

    await expect(restoreCoachClient("client-1")).resolves.toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith("coach_restore_client", { p_client_id: "client-1" })
  })

  it("surfaces roster_limit_reached", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({
      data: { success: false, error: "roster_limit_reached" },
      error: null,
    })

    await expect(restoreCoachClient("client-1")).resolves.toEqual({
      success: false,
      error: "roster_limit_reached",
    })
  })

  it("redirects when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    await expect(restoreCoachClient("client-1")).rejects.toThrow("redirect")
  })
})
