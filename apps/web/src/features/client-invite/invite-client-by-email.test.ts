import { beforeEach, describe, expect, it, vi } from "vitest"
import { inviteClientByEmail } from "./invite-client-by-email"

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

describe("inviteClientByEmail", () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
    from.mockReset()
  })

  it("returns validation error for invalid input", async () => {
    await expect(inviteClientByEmail({ email: "not-an-email" })).resolves.toEqual({
      success: false,
      error: expect.any(String),
    })
  })

  it("creates invite via RPC", async () => {
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

    await expect(
      inviteClientByEmail({ email: "client@example.com" })
    ).resolves.toEqual({ success: true, email: "client@example.com" })

    expect(rpc).toHaveBeenCalledWith(
      "create_client_invite",
      expect.objectContaining({
        p_email: "client@example.com",
      })
    )
  })

  it("surfaces RPC business errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "coach-1" } } })
    rpc.mockResolvedValue({
      data: { success: false, error: "email_is_coach" },
      error: null,
    })

    await expect(
      inviteClientByEmail({ email: "coach@example.com" })
    ).resolves.toEqual({ success: false, error: "email_is_coach" })
  })
})
