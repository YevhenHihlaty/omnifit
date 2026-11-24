#!/usr/bin/env node
/**
 * List or apply bd-scripts/migrations/*.sql in lexicographic order.
 * Usage:
 *   node bd-scripts/scripts/migrate.mjs check
 *   node bd-scripts/scripts/migrate.mjs apply
 * Env: DATABASE_URL or SUPABASE_DB_URL
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'migrations')
const mode = process.argv[2] || 'check'

const files = fs
  .readdirSync(root)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

if (mode === 'check') {
  console.log(`Migrations (${files.length}) in apply order:\n`)
  for (const f of files) console.log(`  ${f}`)
  process.exit(0)
}

if (mode !== 'apply') {
  console.error('Usage: node migrate.mjs [check|apply]')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('Set DATABASE_URL or SUPABASE_DB_URL to apply migrations.')
  process.exit(1)
}

for (const f of files) {
  const full = path.join(root, f)
  console.log(`→ ${f}`)
  const r = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', full], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) {
    console.error(`Failed on ${f}`)
    process.exit(r.status || 1)
  }
}

console.log('All migrations applied.')
