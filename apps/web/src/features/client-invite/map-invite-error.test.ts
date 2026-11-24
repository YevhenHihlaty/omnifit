import { describe, expect, it } from "vitest"
import { mapInviteErrorToMessageKey } from "./map-invite-error"

describe("mapInviteErrorToMessageKey", () => {
  it("maps known roster and invite errors", () => {
    expect(mapInviteErrorToMessageKey("roster_limit_reached")).toBe(
      "clientInvite.errors.rosterLimit"
    )
    expect(mapInviteErrorToMessageKey("invite_already_pending")).toBe(
      "clientInvite.errors.pending"
    )
    expect(mapInviteErrorToMessageKey("email_is_coach")).toBe(
      "clientInvite.errors.emailIsCoach"
    )
  })

  it("falls back to generic", () => {
    expect(mapInviteErrorToMessageKey("unknown")).toBe(
      "clientInvite.errors.generic"
    )
  })
})
