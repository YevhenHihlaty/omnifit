# Migration apply matrix

> OmniFit / Coachr SQL lives in `bd-scripts/migrations/`.  
> Apply in **lexicographic filename order** (numeric prefix + optional letter suffix).  
> Last updated: 2026-09-20

## How to apply

```bash
# Local (psql against local Supabase DB)
npm run migrate:apply

# Or manually:
# for f in bd-scripts/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Requires `DATABASE_URL` (or `SUPABASE_DB_URL`) pointing at Postgres.

## Intentional number gaps

| Gap | Reason |
|-----|--------|
| `029` | Reserved / skipped historically — do not fill with unrelated DDL |
| `040` | Reserved / skipped historically |
| `043` | Reserved / skipped historically |

## Duplicate-prefix resolution (2026-09-20)

| Was | Now |
|-----|-----|
| `012_workouts_progress_photos_storage.sql` | `012b_workouts_progress_photos_storage.sql` |
| `072_search_court_slots_lazy_generate.sql` | `072b_search_court_slots_lazy_generate.sql` |

If an environment already applied the old filenames, record them in `schema_migrations` / your tracker as applied — **do not re-run** the renamed files as new migrations. Fresh installs use the `*b_` names only.

## MVP fix chain (092+)

| File | Purpose |
|------|---------|
| `092_rls_auth_uid_select_wrap.sql` | Wrap `auth.uid()` in RLS policies; hoist helper calls |
| `093_weekly_checkins.sql` | Client weekly subjective check-ins |
| `094_notifications.sql` | In-app notifications table + RLS |
| `095_exercises_catalog.sql` | Global/user exercise catalog |
| `096_payment_invite_invariants.sql` | Immutable acquisition_source; payments write guard docs |
| `097_weekly_checkins_motivation.sql` | Fifth wellness slider (Motivation) on weekly_checkins |
| `098_phone_identity.sql` | `profiles.phone_e164` + `phone_verified_at`; partial unique index |
| `098b_coach_personal_org_rpc.sql` | Role guard trigger; `ensure_coach_personal_organization()` RPC; personal-org unique index |
| `099_invite_only_lockdown.sql` | Revoke `client_join_coach_roster`; roster cap on invite create; revoke/resend/usage RPCs; multi-coach invite preview |
| `100_client_coaches_rpc.sql` | `list_client_coaches()` + `client_leave_coach()` (no `is_primary`) |
| `101_pairing_scope_hardening.sql` | Class-A meals = active coaches only; class-B tasks write scoped to active pairing |
| `102_workout_session_attribution.sql` | Peer coaches SELECT sessions for shared client; workout attribution helper |

## Domains present but out of OmniFit MVP UI

RocketPlay, courts, facilities, marketplace discover RPCs (038+, 055+, 060+) — keep in DB; do not surface in MVP product UI.

## Verify

```bash
npm run migrate:check   # lists files in apply order
npm run test:bd         # pgTAP (needs local DB + pgtap extension)
```
