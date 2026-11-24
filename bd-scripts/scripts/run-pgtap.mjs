#!/usr/bin/env node
/**
 * Run pgTAP tests under bd-scripts/tests/*.sql
 * Env: DATABASE_URL or SUPABASE_DB_URL
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('Set DATABASE_URL or SUPABASE_DB_URL to run pgTAP.')
  process.exit(1)
}

const dir = path.join(__dirname, '..', 'tests')
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error('No pgTAP files in bd-scripts/tests/')
  process.exit(1)
}

const ext = spawnSync(
  'psql',
  [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c', 'create extension if not exists pgtap;'],
  { stdio: 'inherit', shell: process.platform === 'win32' }
)
if (ext.status !== 0) process.exit(ext.status || 1)

let failed = 0
for (const f of files) {
  console.log(`\n=== ${f} ===`)
  const r = spawnSync(
    'psql',
    [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', path.join(dir, f)],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  )
  if (r.status !== 0) failed += 1
}

if (failed) {
  console.error(`\n${failed} test file(s) failed`)
  process.exit(1)
}
console.log('\npgTAP suite passed')
