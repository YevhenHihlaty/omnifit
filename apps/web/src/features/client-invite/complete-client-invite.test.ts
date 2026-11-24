import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getClientInvitePreview,
  parseAcceptClientInviteResult,
  signInWithPassword,
  signUp,
  rpc,
} = vi.hoisted(() => ({
  getClientInvitePreview: vi.fn(),
  parseAcceptClientInviteResult: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/features/client-invite/get-client-invite-preview", () => ({
  getClientInvitePreview,
}))

vi.mock("@/features/client-invite/client-invite-preview", () => ({
  parseAcceptClientInviteResult,
}))

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
    auth: {
      signInWithPassword,
      signUp,
    },
    rpc,
  })),
}))

import { completeClientInvite } from "./complete-client-invite"

describe("completeClientInvite", () => {
  beforeEach(() => {
    getClientInvitePreview.mockReset()
    parseAcceptClientInviteResult.mockReset()
    signInWithPassword.mockReset()
    signUp.mockReset()
    rpc.mockReset()
  })

  it("returns preview error when invite is invalid", async () => {
    getClientInvitePreview.mockResolvedValue({
      valid: false,
      error: "expired",
    })

    await expect(
      completeClientInvite({
        token: "token",
        password: "password1",
        confirmPassword: "password1",
      })
    ).resolves.toEqual({ success: false, error: "expired" })
  })

  it("signs up then accepts invite for new users", async () => {
    getClientInvitePreview.mockResolvedValue({
      valid: true,
      inviteEmail: "client@example.com",
    })
    signInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    })
    signUp.mockResolvedValueOnce({ error: null })
    signInWithPassword.mockResolvedValueOnce({ error: null })
    rpc.mockResolvedValue({ data: { success: true }, error: null })
    parseAcceptClientInviteResult.mockReturnValue({ success: true })

    await expect(
      completeClientInvite({
        token: "token",
        password: "password1",
        confirmPassword: "password1",
      })
    ).rejects.toThrow("redirect")

    expect(rpc).toHaveBeenCalledWith("accept_client_invite", {
      p_token: "token",
      p_disclosure_confirmed: false,
    })
  })
})
