import { describe, expect, it } from "vitest"
import { ForbiddenError, assertCoachRole } from "./coach-role-guard"

describe("assertCoachRole", () => {
  it("does not throw when role is 'coach'", () => {
    expect(() => assertCoachRole("coach")).not.toThrow()
  })

  it("throws ForbiddenError when role is 'client'", () => {
    expect(() => assertCoachRole("client")).toThrow(ForbiddenError)
  })

  it("throws ForbiddenError with status 403 when role is 'client'", () => {
    try {
      assertCoachRole("client")
      // Should not reach here
      expect.fail("expected throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as ForbiddenError).status).toBe(403)
    }
  })

  it("throws ForbiddenError when role is null (unauthenticated)", () => {
    expect(() => assertCoachRole(null)).toThrow(ForbiddenError)
  })

  it("ForbiddenError has name 'ForbiddenError'", () => {
    try {
      assertCoachRole("client")
    } catch (err) {
      expect((err as ForbiddenError).name).toBe("ForbiddenError")
    }
  })

  it("ForbiddenError.status is 403 (not writable after construction)", () => {
    const err = new ForbiddenError()
    expect(err.status).toBe(403)
  })
})
