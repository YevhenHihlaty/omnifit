import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))
const parentRoot = path.join(frontendRoot, "../..")

const resolveTurbopackRoot = (): string => {
  const parentPackageJson = path.join(parentRoot, "package.json")
  if (!existsSync(parentPackageJson)) {
    return frontendRoot
  }

  try {
    const parentPackage = JSON.parse(
      readFileSync(parentPackageJson, "utf8")
    ) as { workspaces?: string[] }
    if (Array.isArray(parentPackage.workspaces)) {
      return parentRoot
    }
  } catch {
    return frontendRoot
  }

  return frontendRoot
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@omnifit/shared", "@omnifit/ui"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: resolveTurbopackRoot(),
  },
}

export default nextConfig
