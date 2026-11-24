# OmniFit — Sprint Roadmap (Solo-Coach MVP)

> **Status:** Active source of truth for sprint execution  
> **Last updated:** 2026-09-21  
> **Authority:** Product → [`PRODUCT_DESCRIPTION.md`](PRODUCT_DESCRIPTION.md) · Visual → [`OmniFit — Design Documentation.md`](OmniFit%20—%20Design%20Documentation.md) · Engineering index → [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md)  
> **Reference implementation:** `D:\coachr-app\frontend` (logic only — never copy Coachr brand, palette, or copy)

---

## Locked product decisions (2026-09-21)

| # | Decision | Lock |
|---|----------|------|
| 1 | **Shared class-A logs** | Every **active** coach sees the client’s meals, workouts, body metrics, progress photos, and weekly check-ins |
| 2 | **No primary coach** | All coaches are equal. No `is_primary` flag, no preferred coach for calorie ring or booking defaults |
| 3 | **Cross-coach history attribution** | On shared history, a coach **can** see past trainings/meals and **which coach** logged them or owned the session (“Logged by Taylor” / “Session with Sam”). Private coach-authored data (notes, tasks, habits *assignments*, targets, messages, pending bookings) stays **pairing-scoped** |
| 4 | **Booking + payments** | See [Payment model](#payment-model) below — request → **coach approve** → optional in-app pay **or** pay coach directly (coach profile USP). Acquisition = **invoice** to coach for platform-sourced clients. Stripe Connect required to receive in-app payouts. |
| 5 | **Pricing page** | Free / Pro / Team “coming soon” |
| 6 | **Languages** | **English (`en`), Polish (`pl`), Ukrainian (`uk`)** — first-class from Sprint 1; all user-facing copy via i18n (no hardcoded English in UI) |
| 7 | **Marketplace listing** | Coach can use the full app **without** publishing to Find Coach. Profile setting: **“Show my profile on marketplace”** switch (`marketplace_visible`, default **off**). Off = invite-only / private practice; on = eligible for Phase 2 discover when marketplace flag is enabled |
| 8 | **Stripe Connect pricing model** | **“Stripe handles pricing”** (not “you handle pricing”) — see [Profitability locks](#profitability-locks-2026-09-21). Platform pays **$0** Connect account/payout fees; coach still bears card processing; OmniFit still collects application fees |
| 9 | **Commercial pricing** | Free ≤**3** active clients · Pro **$29/mo** (~**15%** off annual) · service fee **tier-dependent** · acquisition fee **$15** invoice (hypothesis for Phase 2 test) · failed acquisition → **block** booking |

---

## Profitability locks (2026-09-21)

> Source: Profitability Plan. Highest-leverage change is Connect wiring — decide **before** Sprint 12 onboarding code.

### Fix #1 — Stripe Connect: “Stripe handles pricing”

| | You handle pricing (avoid) | **Stripe handles pricing (locked)** |
|--|---------------------------|-------------------------------------|
| Platform cost per active connected coach | $2/mo when any payout that month | **$0** |
| Platform cost per payout | 0.25% + $0.25 | **$0** |
| Card processing (2.9% + 30¢) | Coach | Coach (billed by Stripe) |
| OmniFit application fees ($1-tier service fee, acquisition invoice) | Yes | **Yes** |

**Why:** A free-tier coach with one $50 session / month under “you handle pricing” can cost OmniFit ~$2.38 Connect fees vs ~$1 fee revenue (net −$1.38). Same coach under “Stripe handles pricing” is net +fee with $0 Connect platform cost. At freemium scale this is the difference between a money-losing long tail and a small positive margin.

**Engineering (Sprint 12):** Configure Connect so Stripe is the pricing controller (platform does **not** take Connect account/payout fees). Still use direct charges on the connected account + `application_fee_amount` for OmniFit’s service fee. Never destination-charge in a way that puts Stripe card fees on the platform.

### Unit economics (MVP infra floor)

| Cost | Monthly | Notes |
|------|---------|--------|
| Vercel Pro | ~$20 | Marketing + web app |
| Supabase Pro | ~$25 | Early growth quotas |
| Stripe Connect (handles pricing) | **$0** | See Fix #1 |
| Transactional email | ~$0–20 | Invites / receipts / notifications |
| **Fixed floor** | **~$45–65** | Flat vs coach count at this scale |

Breakeven ~**2–15** fee-paying / Pro coaches depending mix — **unless** Cal.com Platform API is adopted ($299–$2,499/mo). **Locked:** do **not** use Cal.com Platform/embed API for MVP; scheduling stays **native** (`booking_requests` / `sessions`). Optional later: coach-owned Cal.com / self-hosted sync — never platform-billed Cal.com Platform.

### Fix #2 — Tier & fee recommendations (locked for marketing + Stripe Billing)

| Lever | Lock |
|-------|------|
| **Free** | Cap **3** active clients (that coach’s pairings only) |
| **Pro** | **$29/month**; ~**15%** off annual; unlimited (or high) clients; nutrition / scheduling / payments / messaging bundled |
| **Team** | Coming soon (no price) |
| **Service fee** | **Tier-dependent**, not flat: Free **$1.50** · Pro **$0.50** (or waive on Pro — product default **$0.50** until Billing ships). Applies to **sessions, packages, and coach-sold subscriptions**, not sessions only. Never on `direct` / offline / $0 free sessions |
| **Acquisition fee** | Keep **$15** USD **invoice** to coach for `platform_sourced` (current roadmap). Treat amount as **hypothesis**: before Phase 2 public Find Coach, test $19–$29 flat or capped take-rate (e.g. 10% of first 3 payments, cap ~$30) against real CAC — do not ship $10 auto-debit |
| **Failed acquisition charge** | **Block** the booking / pairing activation — no “debt banner” unpaid balances |

### Prioritized actions (commercial)

1. Commit Connect **“Stripe handles pricing”** before building Connect onboarding (S12)
2. Keep Cal.com Platform API **out** — native booking only for MVP
3. Set Pro **$29** / Free **3** clients in pricing page + Billing products when S12/Phase 2 Subscription ships
4. Implement tier-dependent service fee + apply to packages/subscriptions
5. Treat acquisition **$15** as testable; re-price before Phase 2 marketplace traffic
6. Failed acquisition → **block**, not debt

---

## Payment model

### Booking lifecycle

```text
Client requests session (phone mandatory; coach picker if multi-coach)
        │
        ▼
Coach approves or declines (+ optional message)
        │
        ├─ declined → done (notify client)
        │
        └─ approved
              │
              ├─ free first session (coach option) → session confirmed, $0, no fees
              │
              ├─ coach.payment_collection = 'in_app'
              │     → client pays on OmniFit (Stripe Checkout / Payment Element)
              │     → money → coach’s Connect account (“Stripe handles pricing”)
              │     → platform takes **tier-dependent** service fee as application fee
              │         Free coach: $1.50 · Pro coach: $0.50 (default; may waive later)
              │     → coach bears Stripe card processing fees (billed by Stripe)
              │
              └─ coach.payment_collection = 'direct'
                    → session confirmed without OmniFit checkout
                    → client pays coach outside the app (cash/transfer/etc.)
                    → coach can mark session paid_offline
```

### Coach profile USP — payment collection

| Setting | Client experience | Coach receives money how |
|---------|-------------------|--------------------------|
| **Pay on OmniFit** (`in_app`) | After approval, pay on site before session is fully confirmed / marked paid | Stripe Connect → coach bank |
| **Pay coach directly** (`direct`) | After approval, session is booked; pay the coach outside the app | Outside OmniFit |

Coach onboarding / Settings must **educate** clearly:
1. To accept **in-app** payments they must complete **Stripe Connect** setup (**“Stripe handles pricing”** configuration).
2. **Stripe processing fees** apply to in-app charges (coach bears them — show plain-language estimate).
3. **Platform service fee** (tier-dependent: Free **$1.50** / Pro **$0.50**) — shown on checkout + coach receipt; also applies to packages / coach subscriptions sold in-app.
4. **Client acquisition** — if OmniFit brings the client (`platform_sourced`), the coach owes an acquisition fee (**$15** default invoice); unpaid / failed invoice → **block** activation — no debt banner. Coach-invited: **no** acquisition invoice.

### Acquisition fee (platform-sourced only)

```text
When a platform_sourced pairing becomes active (Phase 2 marketplace / website):
  → Inform coach: “OmniFit introduced this client — acquisition fee applies”
  → Create Stripe Invoice (or platform invoice) to the coach for $15 (testable amount)
  → Track invoice status: draft | open | paid | void
  → If invoice unpaid / charge fails → **block** booking / keep pairing inactive — no debt banner
  → coach_invited → never invoice

MVP: marketplace off → no platform_sourced pairings → invoice path ships tested but dormant
```

### Free first session

Coach option per practice (or per pairing). Approved free session: no client charge, no service fee, no acquisition invoice triggered by that session (acquisition invoice still tied to platform_sourced pairing creation when that path is live).

**Synced with Product Description:** approve-first dual collection · Connect “Stripe handles pricing” · tier-dependent service fee · **$15** acquisition invoice (not $10 auto-debit) · Pro **$29** · Free **3** clients · no Cal.com Platform API.

---

## MVP locks (non-negotiable)

| Decision | Rule |
|----------|------|
| **Persona** | Solo independent coaches only |
| **Companies / gyms / facilities / venues** | **Out of MVP** — no UI, no nav, no tests targeting these |
| **Team studio admin** | Phase 3+ — personal org scaffold only (billing caps), no workspace switcher |
| **Clients** | Invite-only — no open client registration (Phase 2 website discovery can create `platform_sourced`) |
| **Multi-coach** | **First-class:** one client may have **many** active coaches; all pairings equal |
| **Marketplace / Find Coach** | Phase 2 — flag off (but ship $15 fee + phone identity plumbing dormant-ready) |
| **Live video** | Phase 2 — flag off |
| **Surface** | Web-first Next.js (`apps/web`) + shared Supabase |
| **Coverage** | Touched-slice ≥80% · MVP aggregate ≥80% (`docs/COVERAGE_POLICY.md`) |
| **Languages** | English, Polish, Ukrainian (`en` / `pl` / `uk`) |

### Explicitly excluded from this roadmap

- Gym / facility / venue catalogs, court booking, RocketPlay
- Team multi-coach org UI, staff roles, org calendar, book-for-coach
- Public Find Coach marketplace and coach storefront
- WebRTC / in-call logging
- Company marketing pages (`for-companies`)

---

## Reality check (2026-09-21)

| Layer | State | Implication |
|-------|--------|-------------|
| **`apps/web/src`** | **Missing** (configs, e2e smoke, i18n, `@omnifit/{shared,ui}` remain) | Treat web as **greenfield with good tooling** |
| **Database** | ~101 migrations in `bd-scripts/migrations/` | Prefer **additive** MVP deltas over full rebaseline unless spinning a fresh Supabase project |
| **Multi-coach schema** | Already supported (`unique(coach_id, client_id, …)` — not unique on `client_id`) | UX + a few migrations, not a redesign |
| **`@coachr/shared` file: dep** | Points at Coachr filesystem | **Remove in Sprint 1** — CI/clone breaker + brand leak |
| **`typescript.ignoreBuildErrors`** | Enabled in `next.config.ts` | **Remove in Sprint 1** |

---

## Multi-coach product rules

### Invariants

**A — Pairing privacy (class B).** Coach A never reads Coach B’s **private pairing artifacts**: messages, notes, tasks, habit *definitions*, nutrition targets, pending booking inbox for B’s requests. Those stay keyed by `relationship_id` / `coach_id`.

**B — Shared client log (class A).** Meals, workouts, body metrics, progress photos, and weekly check-ins belong to the **client** and are readable by **every active coach**. Disclose on the “add a coach” accept screen.

**C — Attribution is visible (class A metadata).** On shared history, coaches **do** see who authored or owned a log/session:
- Workout logged by client → “Self”
- Workout logged by a coach → “Logged by {coach display name}” (even if that coach is not the viewer)
- Session tied to a pairing → “With {coach display name}”
- Past coaches (archived relationship) still appear as attribution on historical rows from the window they coached

**No primary coach.** Every active pairing is equal. Booking with >1 coaches always requires an explicit coach pick (no silent default). Calorie UI does **not** pick a “winning” coach target — see surface matrix.

### Surface matrix

| Surface | Multi-coach behavior |
|---------|----------------------|
| Client Home calorie ring | Show targets **per coach** (chips/tabs or stacked cards with attribution). No merged/averaged number. If none set → empty state |
| Habits | Grouped by coach (duplicate habits = distinct rows) |
| Coaches strip | Shown when `coach_count > 1` |
| Booking | Coach picker **required** when >1. **Phone required**. Flow: request → **coach approve** → pay in-app or direct per coach USP |
| Messaging | One thread per `relationship_id` — **no group chat** |
| Coach History / Analytics | Shared logs + **coach name on each training/meal attribution**; coach can see prior coaches on historical trainings |
| Coach private surfaces | Notes, tasks, habits, targets, inbox — **own pairing only** |
| Free-tier cap | Counts **that coach’s** active pairings only |

### Phone + identity

```text
Booking request:
  1. Collect E.164 phone (mandatory) → normalize → match existing profile by phone
  2. If match → link to that client (may already have other coaches)
  3. If no match → create/bind client (invite MVP / website Phase 2)
```

### Schema deltas (next free numbers ~098+)

| Migration | Purpose |
|-----------|---------|
| `098_phone_identity` | Normalized unique phone on profiles; booking requires phone; match RPC |
| `099_invite_only_lockdown` | Revoke/fix `client_join_coach_roster` |
| `100_client_coaches_rpc` | `list_client_coaches()` (**no** `is_primary`) |
| `101_pairing_scope_hardening` | Class-B writes cannot cross pairings; class-A attribution readable |
| `102_workout_session_attribution` | `authored_by` / session `coach_id` safe for all active coaches of client |
| `102b_coach_roster_snapshot` | Coach roster list/snapshot/archive/restore/dashboard summary RPCs |
| `103_notification_triggers` | Fan-out message/booking/photo → `enqueue_notification` |
| `104_payment_collection_usp` | `coach_profiles.payment_collection` (`in_app` \| `direct`); session `payment_status` incl. `paid_offline`, `awaiting_payment` |
| `105_acquisition_invoices` | Invoice rows for platform_sourced acquisition (**$15**); Stripe Invoice id; status; never for `coach_invited` |
| `106_marketplace_visibility` | Confirm/default `coach_profiles.marketplace_visible = false`; coach can toggle in Settings; discover RPCs already filter on this column |

---

## Design system (OmniFit — not Coachr)

| Token | Hex | Role |
|-------|-----|------|
| Pine | `#3F6B4F` | Primary action (one per screen) |
| Plum | `#7C6A9C` | Links, secondary, selected |
| Ink 900/700/500 | `#14181C` / `#3E443F` / `#6E7268` | Text hierarchy |
| Stone 300/150 | `#E3DECF` / `#F1ECDF` | Borders / subtle fills |
| Cream / Surface | `#FBF7EF` / `#FFFFFF` | Page / card |
| Warning / Danger | `#B8842A` / `#C1503D` | At risk / destructive |

**Type:** Space Grotesk (headings + numerals) · Inter (body)  
**Shell:** Ink-900 sidebar 220–260px · status as labeled pills · 44px controls  
**Motion:** 150ms press / 350ms enter · `prefers-reduced-motion` · no decorative motion  
**i18n:** `en` / `pl` / `uk` — `next-intl` (or Coachr `lib/i18n` pattern) · messages in `apps/web/messages/{en,pl,uk}.json` · feature `labels.ts` builders · locale cookie + switcher in shell  
**Do not port:** Coachr lime `#C5F347`, Hanken-only “Warm Performance” marketing chrome

---

## Architecture snapshot

```
apps/web/src/
  app/(marketing|auth|onboarding|app)/   # thin pages
  features/<kebab-slice>/                # queries, actions, labels, *View, *Interactive
  components/{ui,shell,providers}/
  lib/{supabase,auth,relationships,billing,motion,feature-flags,i18n}/
packages/{shared,ui}/
bd-scripts/{migrations,tests,seed}/
messages/{en,pl,uk}.json                 # already stubbed
```

**Feature wiring:** `page → queries/labels → *Interactive → *View` · mutations in `actions.ts`  
**Data classes:** (A) client body-of-truth shared across active coaches · (B) coach-authored per `relationship_id` · (C) global catalogs

**Feature flags (MVP):** `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED=0` · `NEXT_PUBLIC_VIDEO_CALLS_ENABLED=0`  
**Locales (MVP):** `en` · `pl` · `uk` — default `en`; persist preference on profile when authenticated

---

## Sprint plan (13 × ~1–2 weeks ≈ 18–22 weeks to beta)

Shared DoD every sprint: touched-slice ≥80% · new RLS covered by pgTAP · lint + typecheck clean · WCAG 2.1 AA on new UI · no Coachr brand strings/hex in shipped UI.

### Critical path

```text
S1 foundation → S2 auth/onboarding → S3 multi-coach invites ─┬─ S4 coach roster
                                                             ├─ S5 client home → S6 meals → S7 training/photos
                                                             └─ S9 booking
                                      S4+S7 ──► S8 analytics
                                      S3 ──► S10 messaging → S11 tasks/settings → S12 payments* → S13 beta
* S12 cuttable — beta can ship free-tier-only
```

**Two engineers after S3:** coach track S4→S8→S11 ‖ client track S5→S6→S7 ‖ converge S9.

---

### Sprint 1 — Foundation, tokens, harness, i18n ✅

**Status:** Done (2026-09-21) — `apps/web/src` scaffolded; `@coachr/shared` removed; TS gate on; en/pl/uk + locale switcher; marketing stubs; 40 unit tests green; production build clean.

**Goal.** Buildable, brand-correct empty app with CI gates and **en/pl/uk** working end to end on shells.

**Deliverables**
- Remove `@coachr/shared` file dep; enable strict TypeScript (`ignoreBuildErrors: false`)
- Design tokens + Tailwind theme from OmniFit Design Doc
- `packages/ui` primitives (Button variants, Input 44px, Toggle, StatusPill, Avatar, EmptyState)
- App shell (coach/client Ink-900 sidebar skeletons) + **locale switcher** (EN / PL / UK)
- `lib/i18n/*` wired to existing `messages/{en,pl,uk}.json`; locale cookie; HTML `lang`
- `lib/supabase/{client,server,middleware}` · feature-flags
- Marketing stubs so `e2e/mvp-smoke.spec.ts` passes in at least `en` + spot-check `pl`/`uk` strings
- CI: lint → typecheck → build → vitest coverage → Playwright
- Migration hygiene / `migrate:check` in CI
- Convention: every feature ships `labels.ts` + message keys — **no raw English in Views**

**Coachr reuse:** supabase clients, feature-flags, routes, motion tokens, `lib/i18n/*` (adapt)

**Exit:** `build` green with types on · smoke e2e green · switching locale updates shell + marketing copy · coverage gates live

---

### Sprint 2 — Auth + coach onboarding + personal org ✅

**Status:** Done (2026-09-21) — coach signup/login/verify/reset/session-expired; middleware session gating + app layout role/onboarding guards; skippable 2-step onboarding; `098`/`098b` phone + `ensure_coach_personal_organization`; empty coach dashboard; 164 unit tests; MVP coverage 100%; client self-register role → 403.

**Goal.** Coach signs up → verifies → onboards → empty dashboard. Clients cannot self-register.

**Deliverables**
- Split-panel signup/login, verify, reset, session-expired
- Server-side reject of client-role open registration
- Middleware role redirects
- Coach onboarding wizard (skippable steps; **no locations/gym catalog**)
- Silent personal org: `organizations(kind=personal)` + `source_organization_id = current_organization_id`
- Empty coach dashboard (zero-state tiles)

**Schema:** verify onboarding org trigger; collect phone on coach signup (E.164); add `098_phone_identity` foundation

**Coachr reuse:** `coach-onboarding/*`, `components/auth/*`, `lib/auth/*`

**Exit:** E2E coach signup→dashboard · pgTAP personal org once · client register returns 403

---

### Sprint 3 — Multi-coach relationships + invite lifecycle ⭐ keystone

**Goal.** Invite-only pairing works for new clients **and** existing multi-coach clients.

**Deliverables**
- Invite by email, pending/resend/revoke
- Invite preview + accept (new user / existing client add-coach disclosure / reject coach accounts)
- Free-tier cap (3 active) with trigger + UI disable
- Client Settings → My coaches: list (equal peers), leave coach — **no** “set primary”
- Migrations `099`, `100`, `101`, `102`

**Coachr reuse:** `client-invite/*`, `client-onboarding/*`, invite dialogs

**Exit (pgTAP merge gate)**
- Same email **or phone** on two coaches → both rosters; class-B data isolated; class-A attribution visible across coaches
- Revoked/expired tokens create no relationship
- Cap blocks 4th invite; `client_join_coach_roster` not executable by `authenticated`
- No `is_primary` column / UI exists

---

### Sprint 4 — Coach roster + Snapshot + live dashboard

**Status:** Implemented (2026-09-21) — migration `102b` + pgTAP `005`; two-pane My Clients + Snapshot detail; archive/restore; live dashboard tiles/charts. Apply with `npm run migrate:apply` + `npm run test:bd` when `DATABASE_URL` is set.

**Goal.** Two-pane My Clients + Snapshot tab + dashboard wired to data.

**Decisions (locked for S4):**
| ID | Choice |
|----|--------|
| D1 Streak | Consecutive calendar days (coach TZ) ending today with ≥1 class-A log (meal / workout / body metric) |
| D2 Adherence % | Days in last 7 with ≥1 class-A log ÷ 7 (`ponytail:` ignores habit targets until S5) |
| D3 Status buckets | `new` = pairing ≤7d and no weekly check-in · `at_risk` = no class-A log ≥4d **or** no weekly check-in ≥14d · `on_track` = else |
| D4 Today | All roster/snapshot/dashboard RPCs take `p_tz text default 'UTC'` |

**Deliverables**
- Roster list + preview pane (Design Doc web)
- Client detail tabs scaffold; Snapshot complete
- Archive/restore; empty states
- Dashboard: active clients, 30-day sessions, streak, check-in chart, status donut, today’s schedule

**Coachr reuse:** `coach-clients/*`, `coach-home/*`

**Exit:** Roster scoped to coach · Snapshot matches seed math · archive frees Free-tier slot

---

### Sprint 5 — Client shell + multi-coach Home + habits

**Status:** Implemented (2026-09-21) — client home with per-coach target chips (no merge); coaches strip when >1; habit toggle; coach Edit plan (nutrition + habits). Apply DB when needed (tables already in `007`/`084`).

**Goal.** Client daily surface correct at 0 / 1 / 3 coaches.

**Deliverables**
- Client shell nav
- Home: calorie hero with **per-coach target chips/tabs** (no primary), quick actions, habits, upcoming session, messages preview
- Your coaches strip when >1
- Coach assign habits + nutrition targets on client detail

**Coachr reuse:** `client-home/*` (esp. coaches strip) — **remove** Find Coach search

**Exit:** 0/1/3-coach fixtures green · target switcher shows each coach’s target without inventing a merge · Coach A cannot write Coach B habits

---

### Sprint 6 — Meal logging (desktop web)

**Status:** Implemented (2026-09-21) — Log hub, log meal (search + draft + today sidebar), manual product, saved meals, Home consumed macros. No barcode UI.

**Goal.** Full meal log without barcode (manual + search).

**Deliverables**
- Log hub · Log meal · product detail · add product manual · saved meals · daily macros

**Coachr reuse:** `log-meal/*`, `saved-meals/*`

**Exit:** Search ranking correct · private products isolated · meals visible on coach Snapshot

---

### Sprint 7 — Training, body metrics, progress photos, check-in

**Status:** Implemented (2026-09-21) — client log training (5 sports + templates), body metrics + required front/side/back photos (≤2MB), weekly check-in (5 scales, Sunday week start), progress shell (Goals / Progress / History / Check-in). Water still coming soon; coach log-on-behalf deferred to S8.

**Goal.** Complete client logging + required three-pose photos.

**Deliverables**
- Log training (5 sport types, templates, custom exercises)
- Body metrics + **front/side/back required** (≤2MB WebP each)
- Weekly check-in (1–5 sliders incl. motivation)
- Client profile: Goals / Progress / History / Check-in

**Coachr reuse:** `log-training/*`, `log-body-metrics/*`, `workout-templates/*`, body-measurements

**Exit:** Sport CHECKs enforced · photos readable by all active coaches · check-in upserts per week

---

### Sprint 8 — Coach analytics, history, gallery, log-on-behalf

**Status:** Implemented (2026-09-21) — History + Analytics tabs on client detail (filters, adherence, weight, gallery compare, check-in compare); snapshot attribution; coach log-on-behalf (`source=coach_offline`, `logged_by_id`); Programs = coach workout library.

**Goal.** Coach sees full history + can log for client.

**Deliverables**
- Analytics (adherence, weight, volume, photo gallery + compare) with **coach attribution** on training rows
- History filters — training/meal rows show “Logged by …” / “With …”
- Log-on-behalf (`source=coach_offline`, `logged_by_id`)
- Coach workout library

**Coachr reuse:** analytics/history panels, `coach-action/*` — prefer **one** `training-log` slice with `onBehalfOf`

**Exit:** Compare two check-ins · coach-logged workout attributed with display name · peer coaches see same class-A logs **and** attribution · class-B notes stay private

---

### Sprint 9 — Calendar + booking approve flow

**Status:** Implemented (2026-09-21) — migration `104`; coach `/sessions` Pending/Upcoming/Past inbox (Web-BookingInbox); client `/calendar` Week/Month + agenda (Web-ClientCalendar); payment pills from `payment_collection`; slot time ranges; past-slot + cancelled guards; i18n en/pl/uk. Realtime/email → S10. Availability slot grid deferred.

**Goal.** Client requests → coach **approves/declines** → calendars sync. Payment happens **after** approval per coach USP (S12).

**Deliverables**
- Coach calendar day/week/month · booking inbox (accept / decline + reason)
- Client calendar · request session with **explicit coach picker** when >1
- **Phone mandatory**; normalize + match existing client by phone
- Coach setting: **free first session**
- On approve: create session with `payment_status` = `not_required` (free) | `awaiting_payment` (in_app) | `direct` (pay outside)
- Cross-coach slot conflict: leak **busy only** on conflict toast
- Realtime + email on decision (all locales) — **S10** (`enqueue_notification` / email)
- i18n for booking copy in en/pl/uk

**Coachr reuse:** `coaching-booking/*`, `coach-sessions/*`, `app-calendar/*`

**Exit:** Approve/decline works · phone required · free-first → confirmed $0 · in_app leaves awaiting_payment · direct leaves direct · DST tests · phone match multi-coach

---

### Sprint 10 — Messaging + notifications

**Status:** Implemented (2026-09-21) — migration `103` (message/booking fan-out, archived read-only inbox/thread, enqueue revoke); role-aware `/messages` split-pane + realtime + optimistic send; notification bell + `/notifications`; deep links; i18n en/pl/uk.

**Goal.** One thread per pairing + notification bell.

**Deliverables**
- Coach/client inbox & thread · Realtime · optimistic send
- Archived relationship → thread read-only (history preserved)
- Notification center + deep links · migration `103`
- Progress-photo fan-out to **all** active coaches

**Coachr reuse:** messaging features (collapse to one role-aware slice)

**Exit:** 3 threads isolated · unread survives reload · `enqueue_notification` not callable by `authenticated`

---

### Sprint 11 — Tasks, notes, profile, payment USP, Free-tier scaffold

**Status:** Implemented (2026-09-21) — tasks + notes CRUD (pairing-scoped); coach profile Plans / Credentials / Settings (no Locations, no Team); `payment_collection` USP + marketplace switch + fee education; subscription usage bar Free 3/3 + Pro $29 placeholder; client locale + anonymize; fees $1.50 / $0.50 / $15; i18n en/pl/uk.

**Goal.** Coach productivity + account surfaces; payment-collection USP + fee education copy.

**Deliverables**
- Tasks + notes CRUD (client-linked optional)
- Coach profile: Plans, Credentials, Settings (**no Locations tab**)
- **Payment USP:** `payment_collection` = Pay on OmniFit | Pay me directly
- **Marketplace visibility switch:** “Show my profile on marketplace” (`marketplace_visible`, default **off**) — coach uses app fully while unpublished; when off, excluded from Find Coach / public storefront even if marketplace flag is later enabled
- **Fee education panel:** Stripe Connect required for in-app (**“Stripe handles pricing”**); Stripe processing fees; platform service fee (Free **$1.50** / Pro **$0.50**); acquisition invoice for platform-introduced clients (**$15**, block if unpaid)
- Personal org metadata only — **no Team & permissions**
- Subscription page: Free **3**/3 usage bar, Pro **$29** placeholder
- Client settings + account delete/anonymize · preferred locale
- All new copy in en/pl/uk

**Coachr reuse:** `coach-tasks`, `coach-notes`, credentials, profile-settings — **skip** locations, public profile, discover

**Exit:** USP persists · marketplace switch defaults off and persists · Connect CTA disabled until onboarded · tasks/notes pairing-scoped · usage matches trigger · no Team UI · locale preference saves · turning switch on does **not** expose coach while `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED=0`

---

### Sprint 12 — Stripe Connect, in-app checkout, acquisition invoices (cuttable)

**Status:** Implemented (2026-09-21) — Connect onboarding (**Stripe handles pricing**); in-app checkout summary + Stripe Hosted (`NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED`); receipt page with post-Stripe reconcile; webhook → `payments` + `payment_status`; mark paid offline → receipt; acquisition invoices list/block (`105`); Connect readiness (none/pending/ready); cancel/failed checkout states; i18n en/pl/uk.

**Goal.** After coach approval: in-app pay via Connect (**Stripe handles pricing**) **or** direct/offline; acquisition fee via **invoice** (not auto-debit on client checkout).

**Deliverables**
- Stripe Connect onboarding with **“Stripe handles pricing”** (required before `in_app` collection works) — **$0** platform Connect account/payout fees
- Post-approval checkout when `payment_collection = in_app`: session/package price + **tier-dependent** service fee (Free **$1.50** / Pro **$0.50**) → Connect direct charge + `application_fee_amount`
- `direct` path: no Checkout; coach “Mark paid offline”
- Free / free-first: no Stripe, no service fee
- Webhooks: signature, idempotency, paid/refunded → session `payment_status`
- Receipts (client + coach) with fee line items; education copy about Stripe fees
- **Acquisition invoices:** create invoice for coach when `platform_sourced` pairing activates; list/pay status in Billing; unpaid → **block**; assert `coach_invited` never invoices
- Migrations `104`, `105`
- Invoice + checkout emails in en/pl/uk

**Exit:** in_app money flow in test mode · direct offline mark works · Connect gate enforced · acquisition invoice only for platform_sourced · coach_invited never invoiced · failed acquisition blocks · payments RLS SELECT-only for users

**Cut line:** If beta timing slips, ship S13 first (invite-only, approve booking, direct payment default) and add Connect later.

---

### Sprint 13 — Beta hardening + marketing + E2E

**Status:** Implemented (2026-09-21) — design-aligned landing + Free/Pro/$29/Team-soon pricing + FAQ; interim privacy/terms; SEO sitemap/robots + app `noindex`; `/offline` + `error.tsx`; Playwright smoke/locale/flags + auth-gated coach↔client & multi-coach suites; brand CI grep; GitHub Actions CI.

**Goal.** Ship-ready invite-only solo-coach product.

**Deliverables**
- Landing + pricing (Free / Pro / Team coming soon) · legal · SEO · `noindex` on app routes — **en/pl/uk**
- Empty/error states from Design Doc (localized)
- Playwright: full coach↔client loop including **approve → pay path**
- **Multi-coach E2E:** second coach invite → class-B isolation → history attribution → booking + phone
- Locale E2E: switch en↔pl↔uk on marketing + one authenticated screen (no missing-key crashes)
- pgTAP complete · a11y pass · feature flags verified off by URL
- CI grep: no Coachr brand strings/hex in bundle; optional missing i18n key check

**Exit:** Both E2E suites green · coverage gates ≥80% · marketplace/video/Team/facility unreachable · Free/Pro/Team-coming-soon pricing live · three locales shippable

---

## Phase 2+ backlog (not this roadmap)

| Phase | Items |
|-------|--------|
| **2** | Find Coach · public storefront (only coaches with `marketplace_visible`) · live `platform_sourced` (**$15** invoices) · WebRTC + in-call log · Pro Stripe Billing · push · ratings · Cal.com sync · barcode (mobile web) |
| **3+** | Team orgs · places/gyms/facilities · group SFU · wearables · API · white-label |
| **Never** | Async client video · cloud recording · AI form analysis · client platform subscription |

---

## Decisions locked — residual implementation notes

| Topic | Default for implementation |
|-------|----------------------------|
| Client calorie UI with N coach targets | Per-coach chips/tabs; client focuses one card for the ring; **no** average |
| Phone uniqueness | E.164 normalized; one profile per phone |
| Free first session | Once per pairing; coach-configurable |
| Default `payment_collection` for new coaches | `direct` until Connect is complete (safer); switching to `in_app` requires Connect |
| Marketplace visibility | Default **`marketplace_visible = false`**; coach must opt in. App works fully either way. Discover requires **both** platform flag on **and** coach switch on |
| Acquisition invoice timing | On `platform_sourced` pairing **activation** (not on client card charge) |
| Service fee | **Tier-dependent:** Free **$1.50** · Pro **$0.50** on each **in-app** paid charge (sessions **and** packages/subscriptions); never on direct/offline or free |
| Acquisition amount | **$15** USD invoice (hypothesis — re-test before Phase 2 Find Coach); never auto-debit client |
| Failed acquisition | **Block** pairing/booking — no debt banner |
| Connect model | **Stripe handles pricing** — $0 platform Connect account/payout fees |
| Pro price | **$29/mo**, ~15% off annual |
| Free client cap | **3** active pairings for that coach |
| Cal.com | **Out of MVP** as Platform API; native booking only |
| When marketplace is off | Invoice path tested, unreachable in MVP |
| i18n missing keys | Fail tests in CI; fallback display key name in dev only |

---

## Testing & security checklist (standing)

- **TDD:** RED → GREEN → coverage:touched on every production change
- **pgTAP:** class-B isolation + class-A shared reads + attribution visibility = permanent merge gate after S3
- **Storage:** progress-photo signed URLs TTL ≤60s; never embed in emails/notifications
- **AuthZ:** class-B keyed by `relationship_id`; class-A attribution readable by all active coaches of that client
- **Phone:** never expose other users’ phones in preview errors; rate-limit phone lookup
- **Service role:** single `lib/supabase/service.ts` with `server-only`
- **Invites:** store `sha256(token)` only; email-match on accept; rate-limit preview
- **Payments:** Connect required for `in_app`; never trust client-supplied amounts; webhook fail-closed; acquisition = invoice to coach only for `platform_sourced`
- **i18n:** no user-facing hardcoded English; en/pl/uk keys present for every shipped string---

## Investor demo anchors

| Week (approx) | Demo |
|---------------|------|
| 4 (end S2) | Coach signup → empty dashboard |
| 8 (end S5–6) | Invite → client logs meal → coach Snapshot |
| 12 (end S9) | Booking request → coach approve/decline |
| 16 (end S10–11) | Messaging + tasks + payment USP education |
| 18–20 (S12–13) | Optional in-app pay / direct + invoices + full beta (3 locales) |
