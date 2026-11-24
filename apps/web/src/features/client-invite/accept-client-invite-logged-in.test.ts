import { beforeEach, describe, expect, it, vi } from "vitest"
import { acceptClientInviteLoggedIn } from "./accept-client-invite-logged-in"
import { getClientInvitePreview } from "@/features/client-invite/get-client-invite-preview"

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

vi.mock("@/features/client-invite/get-client-invite-preview", () => ({
  getClientInvitePreview: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
    rpc,
  })),
}))

describe("acceptClientInviteLoggedIn", () => {
  beforeEach(() => {
    getUser.mockReset()
    rpc.mockReset()
    vi.mocked(getClientInvitePreview).mockReset()
  })

  it("requires disclosure when preview asks for it", async () => {
    vi.mocked(getClientInvitePreview).mockResolvedValue({
      valid: true,
      inviteId: "i1",
      coachId: "coach-1",
      coachName: "Coach",
      inviteEmail: "c@example.com",
      status: "pending",
      expiresAt: "2099-01-01",
      acceptMode: "existing_client",
      sharedLogDisclosure: true,
      activeCoachCount: 1,
      otherCoaches: [{ coachId: "coach-2", displayName: "Other" }],
    })

    await expect(
      acceptClientInviteLoggedIn({ token: "tok", disclosureConfirmed: false })
    ).resolves.toEqual({ success: false, error: "disclosure_required" })
  })

  it("accepts with disclosure confirmed", async () => {
    vi.mocked(getClientInvitePreview).mockResolvedValue({
      valid: true,
      inviteId: "i1",
      coachId: "coach-1",
      coachName: "Coach",
      inviteEmail: "c@example.com",
      status: "pending",
      expiresAt: "2099-01-01",
      acceptMode: "existing_client",
      sharedLogDisclosure: true,
      activeCoachCount: 1,
      otherCoaches: [],
    })
    getUser.mockResolvedValue({ data: { user: { id: "client-1" } } })
    rpc.mockResolvedValue({
      data: { success: true, relationship_id: "rel-1" },
      error: null,
    })

    await expect(
      acceptClientInviteLoggedIn({ token: "tok", disclosureConfirmed: true })
    ).rejects.toThrow("redirect")

    expect(rpc).toHaveBeenCalledWith("accept_client_invite", {
      p_token: "tok",
      p_disclosure_confirmed: true,
    })
  })
})
