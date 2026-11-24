#!/usr/bin/env node
/**
 * CI: fail if Coachr brand strings or legacy hex leak into shipped web sources.
 */
const { execSync } = require("node:child_process")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const patterns = [
  "Coachr",
  "coachr-app",
  "#7CFF3F",
  "#B8FF66",
  "lime-400",
]

let failed = false
for (const pattern of patterns) {
  try {
    const out = execSync(
      `rg -n --glob "!**/node_modules/**" --glob "!**/coverage/**" --glob "!**/.next/**" --glob "!**/docs/**" --glob "!**/scripts/check-no-coachr.js" -e "${pattern}" apps/web/src packages/ui/src packages/shared/src`,
      { cwd: root, encoding: "utf8" }
    )
    if (out.trim()) {
      console.error(`Found forbidden pattern "${pattern}":\n${out}`)
      failed = true
    }
  } catch (err) {
    // rg exit 1 = no matches (good)
    if (err.status !== 1) {
      console.error(err.message)
      failed = true
    }
  }
}

if (failed) {
  process.exit(1)
}
console.log("Brand check passed (no Coachr / legacy lime hex in src).")
