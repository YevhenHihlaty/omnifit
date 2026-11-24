import { ROUTES, clientInvitePath } from "@/lib/routes"

export type CreatedClientInvite = {
  email: string
  token: string
}

export const buildClientInviteUrl = (
  token: string,
  origin = "http://localhost:3000"
): string => `${origin.replace(/\/$/, "")}${clientInvitePath(token)}`

/** ponytail: transactional email provider not wired — URLs logged in dev until Resend/Supabase mail is configured */
export const sendClientInviteEmails = async (
  invites: CreatedClientInvite[],
  coachName: string,
  origin?: string
): Promise<{ sent: number; urls: string[] }> => {
  const baseOrigin =
    origin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const urls = invites.map((invite) => buildClientInviteUrl(invite.token, baseOrigin))

  if (process.env.NODE_ENV !== "production") {
    for (const [index, invite] of invites.entries()) {
      console.info(
        `[client-invite] ${coachName} → ${invite.email}: ${urls[index]}`
      )
    }
  }

  return { sent: invites.length, urls }
}
