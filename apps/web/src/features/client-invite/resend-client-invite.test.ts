import { beforeEach, describe, expect, it, vi } from "vitest"
import { resendClientInvite } from "./resend-client-invite"
import { sendClientInviteEmails } from "@/features/client-invite/send-client-invite-emails"

const getUser = vi.fn()
const rpc = vi.fn()
const from = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect")
  }),
}))

vi.mock("@/features/client-invite/send-client-invite-emails", () => ({
  sendClientInviteEmails: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
    rpc,
    from,
  })),
}))

describe("resendClientInvite", () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
    from.mockReset()
    vi.mocked(sendClientInviteEmails).mockReset()
  })

  it("rotates token and sends email", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({
      data: { success: true, email: "client@example.com" },
      error: null,
    })
    from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { display_name: "Coach", email: "coach@example.com" },
            error: null,
          }),
        }),
      }),
    })

    await expect(resendClientInvite("invite-1")).resolves.toEqual({
      success: true,
      email: "client@example.com",
    })

    expect(rpc).toHaveBeenCalledWith(
      "resend_client_invite",
      expect.objectContaining({ p_invite_id: "invite-1" })
    )
    expect(sendClientInviteEmails).toHaveBeenCalled()
  })

  it("surfaces RPC errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({
      data: { success: false, error: "not_found" },
      error: null,
    })

    await expect(resendClientInvite("missing")).resolves.toEqual({
      success: false,
      error: "not_found",
    })
  })
})
