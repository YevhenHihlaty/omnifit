import { describe, expect, it } from "vitest"
import { createHash } from "crypto"
import { hashInviteToken } from "./hash-invite-token"

describe("hashInviteToken", () => {
  it("matches sha256 hex digest", () => {
    const token = "sample-token"
    expect(hashInviteToken(token)).toBe(
      createHash("sha256").update(token).digest("hex")
    )
  })
})
