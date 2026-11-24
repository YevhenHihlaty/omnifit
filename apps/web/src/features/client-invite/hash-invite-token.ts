import { createHash } from "crypto"

export const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex")
