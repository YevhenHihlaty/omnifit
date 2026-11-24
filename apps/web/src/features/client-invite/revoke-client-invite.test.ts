import { beforeEach, describe, expect, it, vi } from "vitest"
import { revokeClientInvite } from "./revoke-client-invite"

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

describe("revokeClientInvite", () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
  })

  it("revokes via RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({ data: { success: true }, error: null })

    await expect(revokeClientInvite("invite-1")).resolves.toEqual({ success: true })
    expect(rpc).toHaveBeenCalledWith("revoke_client_invite", {
      p_invite_id: "invite-1",
    })
  })

  it("surfaces business errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({
      data: { success: false, error: "invalid_status" },
      error: null,
    })

    await expect(revokeClientInvite("invite-1")).resolves.toEqual({
      success: false,
      error: "invalid_status",
    })
  })
})
