# OmniFit — Database Fix Plan

> **Date:** 2026-09-20  
> **Status:** Batches 0–3 complete — remote `coachr-app` verified; Phase A unblocked  
> **Migrations home:** `bd-scripts/migrations/` (no `supabase/` or `packages/supabase/` in this repo)  
> **Companion:** [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md)

---

## 1. Current state

| Metric | Finding |
|--------|---------|
| Migration count | 001–096 (012b/072b renamed; gaps 029/040/043 documented in matrix) |
| User-data tables | All MVP tables have RLS; policies use `(select auth.uid())` wrap |
| Seed | `bd-scripts/seed/` — demo coach/client seed present (Batch 0) |
| pgTAP | Harness + suite under `bd-scripts/tests/` (`npm run test:bd`) |
| Extra domains in schema | RocketPlay, courts, facilities, marketplace — keep dormant for OmniFit MVP UI |
| Remote | `coachr-app` (`nykqchswsgmgceyjfown`) — 092–096 applied + verified 2026-09-20 |

Core MVP tables **present:** profiles, coach/client_profiles, organizations, organization_members, coach_client_relationships, sessions, booking_requests, tasks, coach_notes, meals/meal_items, food_products, saved_meals, workouts/workout_sets, body_metrics, progress_photos, daily_habits/habit_completions, conversations/messages, video_calls (Phase 2), client_invites, payments + acquisition_source (091), **weekly_checkins (093), notifications (094), exercises (095)**.

---

## 2. Gap vs PRODUCT / DEVELOPMENT plan

| Expected | Status | Action |
|----------|--------|--------|
| `weekly_checkins` | **DONE** (093) | Wire UI in Phase A/B |
| `notifications` | **DONE** (094; progress_photos → coach trigger) | Add message/booking triggers when those UIs ship |
| `training_plans` | Map to `coach_service_plans` | Optional normalize later |
| `certificates` / `work_experience` / `education` / `achievements` | JSONB in `coach_profiles.onboarding_snapshot` only | Defer normalize to post-MVP |
| Global `exercises` | **DONE** (095 catalog) | Wire workout UI; `workout_exercises` still optional |
| `organization_member_limits` / `partner_entitlements` | **MISSING** | Phase 3 — skip |
| Cal.com columns | Stub `sessions.cal_com_booking_id` (096) | Full integration later |
| `acquisition_source` | **PRESENT** + immutable (091/096) | Keep |
| Stripe IDs / `payments` | **PRESENT**; webhook-only writes | Keep |

---

## 3. Critical / high issues

### CRITICAL — RLS `auth.uid()` not wrapped

Every policy uses raw `auth.uid()`, which Postgres re-evaluates per row.

```sql
-- Bad (current)
using (coach_id = auth.uid())

-- Good
using (coach_id = (select auth.uid()))
```

Same for helper calls:

```sql
-- Prefer
or (select public.coach_has_active_client((select auth.uid()), client_id))
```

**Impact:** Large table scans (meals, messages, sessions) become 10–100× slower.

### HIGH — Duplicate migration number prefixes

| Conflict | Files |
|----------|-------|
| `012` | `012_workouts_and_body_metrics.sql` + `012_workouts_progress_photos_storage.sql` |
| `072` | `072_exclude_company_admin_from_marketplace_discover.sql` + `072_search_court_slots_lazy_generate.sql` |

**Action:** Rename seconds to `012b_…` and `072b_…` in git **and** update any apply matrix. If already applied in shared envs, rename only in docs + add no-op markers — do not re-run under new names without tracking.

### HIGH — `organizations` SELECT owner-only

Base policy in `003` is owner-only. Team members may not read org rows despite `organization_members`. Broaden for active members (needed before any Team UI; also safer for personal-org metadata reads).

### HIGH — Numbering gaps

Missing: `029`, `040`, `043`. Document as intentional skips in `bd-scripts/MIGRATION_APPLY_MATRIX.md` (create if absent).

### MEDIUM — Seed empty; no pgTAP

Blocks E2E and RLS confidence.

### LOW (MVP) — Anon marketplace RPCs

Intentional for Phase 2 discover; leave as-is but keep feature flag off in app.

---

## 4. Fix batches (ordered)

### Batch 0 — Hygiene (do first, no product behavior change)

| # | Change | Files |
|---|--------|-------|
| 0.1 | Document gaps 029/040/043 + apply order | `bd-scripts/MIGRATION_APPLY_MATRIX.md` |
| 0.2 | Rename duplicate prefixes to `012b_` / `072b_` (or document if already applied) | migrations |
| 0.3 | Add real seed: coach + client auth users instructions + SQL for profiles/relationship/sample meal | `bd-scripts/seed/` |
| 0.4 | Scaffold pgTAP harness | `bd-scripts/tests/` + `npm run test:bd` |

**Validate:** Fresh local apply from 001 → latest succeeds; seed creates pairable coach/client.

### Batch 1 — RLS performance + org read (092)

Create `092_rls_auth_uid_select_wrap.sql`:

1. For each policy on MVP-critical tables, replace `auth.uid()` with `(select auth.uid())`.  
2. Wrap `coach_has_active_client` / `coach_has_roster_client` invocations in `(select …)`.  
3. Add/replace `organizations` SELECT policy:

```sql
-- Pseudocode
create policy organizations_select_member on public.organizations
for select to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_active_org_member(id, (select auth.uid()))
);
```

**Priority tables first (if full rewrite too large):**  
`profiles`, `coach_client_relationships`, `sessions`, `meals`, `meal_items`, `workouts`, `workout_sets`, `body_metrics`, `progress_photos`, `conversations`, `messages`, `booking_requests`, `payments`, `tasks`, `coach_notes`, `client_invites`.

**Validate:** `explain analyze` on roster + meals list; pgTAP: coach sees only active clients; client cannot read other clients.

### Batch 2 — MVP schema gaps (093–095)

#### 093 — `weekly_checkins`

```sql
create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  sleep smallint check (sleep between 1 and 5),
  soreness smallint check (soreness between 1 and 5),
  stress smallint check (stress between 1 and 5),
  energy smallint check (energy between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (client_id, week_start)
);
-- RLS: client CRUD own; coach SELECT via active relationship
```

#### 094 — `notifications`

```sql
create type public.notification_kind as enum (
  'message',
  'booking_request',
  'booking_decision',
  'progress_photos',
  'payment',
  'subscription',
  'system'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
-- RLS: user SELECT/UPDATE own; INSERT via security definer triggers/RPCs only
```

Wire triggers (minimal MVP):

- New `messages` → notify other participant  
- `booking_requests` status change → notify counterpart  
- Progress photo insert → notify coach (can replace or complement 044 flags)  

#### 095 — Optional `exercises` catalog (recommended)

```sql
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport_type public.sport_type,
  default_field_mask jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  usage_count int not null default 0,
  source text not null check (source in ('seed','user')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
-- RLS: authenticated read shared; users insert own source=user
```

If time-boxed: skip 095 and use free-text exercise names on sets until Sprint after logging ships.

### Batch 3 — Payments / invite invariants (096)

| Change | Why |
|--------|-----|
| CHECK or trigger: `acquisition_source` immutable after insert | Prevent fee gaming |
| Ensure `payments` has no authenticated INSERT (service_role / webhook only) | Already intended — verify |
| Document `acquisition_fee_owed` = service_role only | Webhook constraint |
| Optional: `sessions.cal_com_booking_id text` nullable stub | Future Cal.com without redesign |

### Batch 4 — Do **not** do in MVP

- Normalize credentials out of JSONB  
- `organization_member_limits` / `partner_entitlements`  
- Drop or rewrite RocketPlay/court migrations  
- Full marketplace RLS redesign  

---

## 5. Security checklist (apply with each batch)

- [x] RLS enabled on every new table (`weekly_checkins`, `notifications`, `exercises`)  
- [x] Policies use `(select auth.uid())` (0 bare `auth.uid()` policies on remote)  
- [x] No `user_metadata` in authz — use `app_metadata` / tables  
- [x] `enqueue_notification`: fixed `search_path`, EXECUTE = service_role only  
- [ ] Views (if any): `security_invoker = true` — N/A for 092–096  
- [ ] Storage: progress-photos / avatars policies unchanged and tested (smoke in Phase A)  
- [x] `payments` writes only from trusted webhook path (no authenticated INSERT policies)  
- [x] Invite accept RPCs remain without exposing service_role to client  

### Advisors (remote `coachr-app`, 2026-09-20)

No ERROR. Five WARN categories — all **non-blocking** for Phase A:

| WARN | Verdict |
|------|---------|
| `function_search_path_mutable` | Pre-existing corpus; new 092–096 funcs set `search_path` |
| `extension_in_public` | Pre-existing |
| `anon` / `authenticated` SECURITY DEFINER executable | Expected for RLS helpers; `enqueue_notification` correctly locked down |
| `auth_leaked_password_protection` | Auth dashboard — enable before production signup |

---

## 6. Test plan (pgTAP)

Minimum suite after Batch 1–2:

| Test | Assert |
|------|--------|
| `profiles_own_row` | User reads/updates self only |
| `roster_active_only` | Coach sees active clients; not archived without policy |
| `meal_coach_read` | Coach reads client meals via relationship |
| `meal_stranger_denied` | Unrelated user gets 0 rows |
| `invite_accept_creates_relationship` | `acquisition_source = coach_invited` |
| `notifications_own_only` | User cannot read others’ notifications |
| `weekly_checkin_coach_read` | Coach can read paired client check-ins |
| `payments_no_client_insert` | Authenticated INSERT on payments fails |
| `free_tier_roster_cap` | 4th client blocked via `089` helpers |

Run: `npm run test:bd` (wire script if missing).

---

## 7. Seed plan

Replace stub with:

1. Document: create Auth users in dashboard (coach@ / client@) with known UUIDs **or** use local `supabase auth` fixtures  
2. INSERT profiles, coach_profiles, client_profiles, personal organization, membership  
3. INSERT active `coach_client_relationships` with `acquisition_source = 'coach_invited'`  
4. Sample meal + workout + body_metrics + 3 progress_photos placeholders  
5. One pending `booking_request`  

E2E env vars: `E2E_COACH_*`, `E2E_CLIENT_*` aligned with seed.

---

## 8. Execution checklist

```text
[x] Batch 0 — matrix, rename 012b/072b, seed, pgTAP harness, migrate scripts
[x] Batch 1 — 092 RLS wrap + organizations select merge
[x] Batch 2 — 093 weekly_checkins, 094 notifications, 095 exercises
[x] Batch 3 — 096 payment/invite invariants
[x] Applied to remote coachr-app (nykqchswsgmgceyjfown) via Supabase MCP — 2026-09-20
[x] Advisors review — 0 ERROR; WARNs non-blocking (see §5)
[x] Remote verify — tables, wrapped RLS, triggers, enqueue grants
[ ] Local migrate full chain (`npm run migrate:apply`) if using local Supabase
[ ] pgTAP green (`npm run test:bd` with DATABASE_URL)
[ ] Point apps/web at Supabase and smoke invite + meal read  → Phase A
```

**Applied in repo (2026-09-20):** migrations `092`–`096`, `bd-scripts/MIGRATION_APPLY_MATRIX.md`, `npm run migrate:check|migrate:apply|test:bd`.

**Remote verified:** `weekly_checkins` / `notifications` / `exercises` exist; `sessions.cal_com_booking_id` stub; acquisition + photo-notify triggers; all sampled policies use `( SELECT auth.uid() AS uid)`; `enqueue_notification` EXECUTE = service_role only.

**Verdict:** Batches 0–3 **COMPLETE** for Phase A. Non-blocking leftovers: local pgTAP/seed run, message/booking notification triggers when those UIs ship, Auth leaked-password protection before prod.

**Next:** [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) Phase A (tokens + auth + feature scaffold).
