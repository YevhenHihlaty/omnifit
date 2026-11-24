import { redirect } from "next/navigation"
import { getAppUser } from "@/lib/auth/get-app-user"
import { ROUTES } from "@/lib/routes"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { AppTopBar } from "@/components/shell/AppTopBar"
import { getCoachRosterUsage } from "@/features/client-invite/queries"
import type { ReactNode } from "react"

export { metadata } from "@/lib/seo/noindex"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getAppUser()

  if (!user) redirect(ROUTES.login)
  if (user.role === "client") redirect(ROUTES.clientHome)
  if (user.role !== "coach") redirect(ROUTES.sessionExpired)
  if (!user.onboardingCompletedAt) redirect(ROUTES.onboardingProfile)

  const usage = await getCoachRosterUsage()

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        role="coach"
        displayName={user.displayName}
        tier={usage?.tier ?? "free"}
      />
      <main className="flex-1 overflow-y-auto bg-cream p-6 lg:p-8">
        <AppTopBar />
        {children}
      </main>
    </div>
  )
}
