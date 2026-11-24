import { redirect } from "next/navigation"
import { getAppUser } from "@/lib/auth/get-app-user"
import { ROUTES } from "@/lib/routes"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { AppTopBar } from "@/components/shell/AppTopBar"
import type { ReactNode } from "react"

export { metadata } from "@/lib/seo/noindex"

/** Shared coach+client surfaces (messages, notifications) — one URL, role-aware shell. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getAppUser()

  if (!user) redirect(ROUTES.login)
  if (user.role === "coach" && !user.onboardingCompletedAt) {
    redirect(ROUTES.onboardingProfile)
  }
  if (user.role !== "coach" && user.role !== "client") {
    redirect(ROUTES.home)
  }

  const role = user.role === "coach" ? "coach" : "client"

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={role} />
      <main className="flex-1 overflow-y-auto bg-cream p-6 lg:p-8">
        <AppTopBar />
        {children}
      </main>
    </div>
  )
}
