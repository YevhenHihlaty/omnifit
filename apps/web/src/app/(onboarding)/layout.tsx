import { redirect } from "next/navigation"
import { getAppUser } from "@/lib/auth/get-app-user"
import { ROUTES } from "@/lib/routes"
import type { ReactNode } from "react"

export { metadata } from "@/lib/seo/noindex"

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getAppUser()

  if (!user) redirect(ROUTES.login)
  if (user.role !== "coach") redirect(ROUTES.sessionExpired)
  if (user.onboardingCompletedAt) redirect(ROUTES.dashboard)

  return <>{children}</>
}
