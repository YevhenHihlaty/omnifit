import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel"
import type { ReactNode } from "react"

export { metadata } from "@/lib/seo/noindex"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[600px_1fr]">
      <AuthBrandPanel />
      <section className="flex flex-col justify-center bg-cream px-4 py-12 sm:px-10">
        {children}
      </section>
    </main>
  )
}
