import { describe, expect, it } from "vitest"
import {
  parseAcceptClientInviteResult,
  parseClientInvitePreview,
} from "./client-invite-preview"

describe("parseClientInvitePreview", () => {
  it("parses a valid preview with disclosure fields", () => {
    expect(
      parseClientInvitePreview({
        valid: true,
        invite_id: "inv-1",
        coach_id: "coach-1",
        coach_name: "Alex Coach",
        invite_email: "client@example.com",
        status: "pending",
        expires_at: "2026-07-01T00:00:00Z",
        accept_mode: "existing_client",
        shared_log_disclosure: true,
        active_coach_count: 1,
        other_coaches: [
          { coach_id: "coach-2", display_name: "Jordan" },
        ],
      })
    ).toEqual({
      valid: true,
      inviteId: "inv-1",
      coachId: "coach-1",
      coachName: "Alex Coach",
      inviteEmail: "client@example.com",
      status: "pending",
      expiresAt: "2026-07-01T00:00:00Z",
      acceptMode: "existing_client",
      sharedLogDisclosure: true,
      activeCoachCount: 1,
      otherCoaches: [{ coachId: "coach-2", displayName: "Jordan" }],
    })
  })

  it("maps invalid preview errors", () => {
    expect(
      parseClientInvitePreview({ valid: false, error: "expired" })
    ).toEqual({ valid: false, error: "expired" })
  })
})

describe("parseAcceptClientInviteResult", () => {
  it("parses success", () => {
    expect(
      parseAcceptClientInviteResult({
        success: true,
        relationship_id: "rel-1",
      })
    ).toEqual({
      success: true,
      relationshipId: "rel-1",
      alreadyAccepted: false,
    })
  })

  it("parses failure", () => {
    expect(
      parseAcceptClientInviteResult({ success: false, error: "email_mismatch" })
    ).toEqual({ success: false, error: "email_mismatch" })
  })
})
