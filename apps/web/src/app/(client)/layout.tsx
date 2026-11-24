import { redirect } from "next/navigation"
import { getAppUser } from "@/lib/auth/get-app-user"
import { ROUTES } from "@/lib/routes"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { AppTopBar } from "@/components/shell/AppTopBar"
import type { ReactNode } from "react"

export { metadata } from "@/lib/seo/noindex"

export default async function ClientAppLayout({ children }: { children: ReactNode }) {
  const user = await getAppUser()

  if (!user) redirect(ROUTES.login)
  if (user.role !== "client") redirect(ROUTES.dashboard)

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role="client" />
      <main className="flex-1 overflow-y-auto bg-cream p-6 lg:p-8">
        <AppTopBar />
        {children}
      </main>
    </div>
  )
}
