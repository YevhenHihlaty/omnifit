import { beforeEach, describe, expect, it, vi } from "vitest"
import { archiveCoachClient } from "./archive-coach-client"

const getUser = vi.fn()
const rpc = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("redirect") }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, rpc })),
}))

describe("archiveCoachClient", () => {
  beforeEach(() => { getUser.mockReset(); rpc.mockReset() })

  it("archives via RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({ data: { success: true }, error: null })

    await expect(archiveCoachClient("client-1")).resolves.toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith("coach_archive_client", { p_client_id: "client-1" })
  })

  it("surfaces RPC errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({ data: null, error: { message: "db_error" } })

    await expect(archiveCoachClient("client-1")).resolves.toEqual({
      success: false,
      error: "db_error",
    })
  })

  it("surfaces business errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({ data: { success: false, error: "not_active" }, error: null })

    await expect(archiveCoachClient("client-1")).resolves.toEqual({
      success: false,
      error: "not_active",
    })
  })

  it("redirects when unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    await expect(archiveCoachClient("client-1")).rejects.toThrow("redirect")
  })
})
