import { describe, expect, it } from "vitest"
import {
  completeClientInviteSchema,
  inviteClientByEmailSchema,
} from "./validators"

describe("inviteClientByEmailSchema", () => {
  it("accepts email only", () => {
    const result = inviteClientByEmailSchema.safeParse({
      email: "client@example.com",
    })
    expect(result.success).toBe(true)
  })

  it("accepts optional origin ids", () => {
    const result = inviteClientByEmailSchema.safeParse({
      email: "client@example.com",
      originSessionId: "00000000-0000-4000-8000-000000000001",
      originSeriesId: "00000000-0000-4000-8000-000000000002",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid email", () => {
    expect(inviteClientByEmailSchema.safeParse({ email: "nope" }).success).toBe(
      false
    )
  })
})

describe("completeClientInviteSchema", () => {
  it("requires matching passwords", () => {
    const result = completeClientInviteSchema.safeParse({
      token: "abc",
      password: "password1",
      confirmPassword: "password2",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid payload", () => {
    const result = completeClientInviteSchema.safeParse({
      token: "abc",
      password: "password1",
      confirmPassword: "password1",
    })
    expect(result.success).toBe(true)
  })
})
