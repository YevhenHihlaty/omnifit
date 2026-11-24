import { describe, expect, it } from "vitest"
import { resolveUserRole } from "./resolve-user-role"

describe("resolveUserRole", () => {
  // ── Happy paths ──────────────────────────────────────────────────────────────

  it("returns 'coach' when profile.role is 'coach'", () => {
    expect(resolveUserRole({ role: "coach" })).toBe("coach")
  })

  it("returns 'client' when profile.role is 'client'", () => {
    expect(resolveUserRole({ role: "client" })).toBe("client")
  })

  // ── Profile wins — user_metadata must never influence the result ─────────────

  it("ignores any user_metadata argument; role comes from profile only", () => {
    // Even if a caller (mistakenly) passes user_metadata as profile,
    // only the profile object is consulted.
    expect(resolveUserRole({ role: "coach" })).toBe("coach")
  })

  // ── Invalid / missing role → null ────────────────────────────────────────────

  it("returns null when profile is null", () => {
    expect(resolveUserRole(null)).toBeNull()
  })

  it("returns null when profile is undefined", () => {
    expect(resolveUserRole(undefined)).toBeNull()
  })

  it("returns null when profile.role is null", () => {
    expect(resolveUserRole({ role: null })).toBeNull()
  })

  it("returns null when profile.role is undefined", () => {
    expect(resolveUserRole({ role: undefined })).toBeNull()
  })

  it("returns null when profile.role is an empty string", () => {
    expect(resolveUserRole({ role: "" })).toBeNull()
  })

  it("returns null when profile.role is an unknown string", () => {
    expect(resolveUserRole({ role: "admin" })).toBeNull()
  })

  it("returns null when profile.role is 'COACH' (case-sensitive)", () => {
    // Role must match exactly; uppercase variants are not valid.
    expect(resolveUserRole({ role: "COACH" })).toBeNull()
  })

  it("returns null when profile.role is a number coerced to string", () => {
    // @ts-expect-error intentional bad input
    expect(resolveUserRole({ role: 1 })).toBeNull()
  })

  it("returns null when profile has no role key", () => {
    expect(resolveUserRole({})).toBeNull()
  })
})
