import { describe, it, expect } from "vitest"
import { assertCoachOnlySignupRole } from "./coach-role-guard"

describe("assertCoachOnlySignupRole", () => {
  it("allows absent role (undefined)", () => {
    expect(assertCoachOnlySignupRole(undefined)).toEqual({ ok: true })
  })
  it("allows null role", () => {
    expect(assertCoachOnlySignupRole(null)).toEqual({ ok: true })
  })
  it("allows empty string role", () => {
    expect(assertCoachOnlySignupRole("")).toEqual({ ok: true })
  })
  it("allows explicit coach role", () => {
    expect(assertCoachOnlySignupRole("coach")).toEqual({ ok: true })
  })
  it("returns 403 for client role", () => {
    expect(assertCoachOnlySignupRole("client")).toEqual({ ok: false, status: 403 })
  })
  it("returns 403 for unknown roles", () => {
    expect(assertCoachOnlySignupRole("admin")).toEqual({ ok: false, status: 403 })
    expect(assertCoachOnlySignupRole("superuser")).toEqual({ ok: false, status: 403 })
  })
})
