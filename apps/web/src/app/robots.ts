import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo/metadata"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/home",
          "/clients",
          "/sessions",
          "/messages",
          "/calendar",
          "/profile",
          "/settings",
          "/onboarding",
          "/login",
          "/register",
          "/offline",
          "/api/",
          "/invite/",
          "/receipt/",
          "/notifications",
          "/tasks",
          "/notes",
          "/programs",
          "/log",
          "/check-in",
          "/progress",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
