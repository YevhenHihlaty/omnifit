import { describe, expect, it } from "vitest"
import { e164PhoneSchema } from "./phone-schema"

const valid = (phone: string) => e164PhoneSchema.safeParse(phone).success
const invalid = (phone: string) => !valid(phone)

describe("e164PhoneSchema", () => {
  // ── Valid E.164 numbers ───────────────────────────────────────────────────────

  it("accepts US number +15551234567", () => {
    expect(valid("+15551234567")).toBe(true)
  })

  it("accepts UK number +447911123456", () => {
    expect(valid("+447911123456")).toBe(true)
  })

  it("accepts Ukraine number +380931234567", () => {
    expect(valid("+380931234567")).toBe(true)
  })

  it("accepts minimum-length E.164 (+12345678 — 8 digits)", () => {
    expect(valid("+12345678")).toBe(true)
  })

  it("accepts maximum-length E.164 (15 digits after +)", () => {
    // 15 digits — ITU E.164 upper bound / migration 098
    expect(valid("+123456789012345")).toBe(true)
  })

  it("accepts Polish number +48123456789", () => {
    expect(valid("+48123456789")).toBe(true)
  })

  // ── Missing + prefix ──────────────────────────────────────────────────────────

  it("rejects number without leading +", () => {
    expect(invalid("15551234567")).toBe(true)
  })

  it("rejects number starting with 00 instead of +", () => {
    expect(invalid("0015551234567")).toBe(true)
  })

  // ── Letters in number ─────────────────────────────────────────────────────────

  it("rejects number containing letters", () => {
    expect(invalid("+1555abc4567")).toBe(true)
  })

  it("rejects number containing spaces", () => {
    expect(invalid("+1 555 123 4567")).toBe(true)
  })

  it("rejects number containing dashes", () => {
    expect(invalid("+1-555-123-4567")).toBe(true)
  })

  // ── Too short ─────────────────────────────────────────────────────────────────

  it("rejects + with only 1 digit (too short)", () => {
    expect(invalid("+1")).toBe(true)
  })

  it("rejects + with 7 digits (below migration minimum 8)", () => {
    expect(invalid("+1234567")).toBe(true)
  })

  // ── Too long ──────────────────────────────────────────────────────────────────

  it("rejects number exceeding 15 digits", () => {
    expect(invalid("+1234567890123456")).toBe(true)
  })

  // ── Leading zero after + ──────────────────────────────────────────────────────

  it("rejects +0... (country code cannot start with 0)", () => {
    expect(invalid("+015551234567")).toBe(true)
  })

  // ── Empty / null-ish ─────────────────────────────────────────────────────────

  it("rejects empty string", () => {
    expect(invalid("")).toBe(true)
  })

  it("rejects bare + with no digits", () => {
    expect(invalid("+")).toBe(true)
  })
})
