# OmniFit — Full Implementation Plan

> **Date:** 2026-09-20  
> **Status:** Ready for execution  
> **Scope authority:** [`docs/PRODUCT_DESCRIPTION.md`](../PRODUCT_DESCRIPTION.md)  
> **Visual authority:** [`docs/OmniFit — Design Documentation.md`](../OmniFit%20—%20Design%20Documentation.md)  
> **Engineering companion:** [`docs/DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md)  
> **Related:** [`DATABASE_FIX_PLAN.md`](./DATABASE_FIX_PLAN.md) · [`CLAUDE_DESIGN_PROMPTS.md`](./CLAUDE_DESIGN_PROMPTS.md)

---

## 1. Executive verdict

| Layer | Status | Gap |
|-------|--------|-----|
| **Product docs** | Clear coach-first MVP | Invite-only clients; Connect **“Stripe handles pricing”** + tier-dependent service fee; marketplace/video Phase 2 |
| **Design** | Strong mobile (~60 screens); partial web (~20) | ~19–22 missing screens (checkout, tasks, notes, notifications, web messaging, legal, web client logging) |
| **Web app** (`apps/web`) | Auth + marketing + coach UI shells | Demo data; empty `features/`; no client product; no invites/logging/messaging |
| **Database** (`bd-scripts/migrations`) | Rich (~91 migrations, 44 tables, RLS on) | Missing `weekly_checkins`, `notifications`; auth.uid() perf; RocketPlay/court noise for MVP |

**Main job:** Wire Design Doc → feature modules → existing DB. Design the missing P0 screens in parallel. Do not invent new product scope.

### Defaults locked for this plan

1. **Visual:** Pine `#3F6B4F` / Cream `#FBF7EF` / Space Grotesk + Inter (Design Doc) — not Warm Performance lime/Hanken from DEV plan §9  
2. **Clients:** Invite-only (no open client signup; hide Find Coach)  
3. **Payments:** Stripe Connect **“Stripe handles pricing”** + tier-dependent service fee (Free **$1.50** / Pro **$0.50**); acquisition **$15** invoice (Phase 2)  
4. **Scheduling:** Native `booking_requests` + `sessions`; **no** Cal.com Platform API  
5. **Track:** Web-first in `apps/web`; Expo mobile after web beta  
6. **Out of MVP UI:** Marketplace, live video, Team org, courts/facilities/RocketPlay  
7. **Commercial:** Free **3** clients · Pro **$29/mo** · failed acquisition → **block**  

> **Profitability locks (2026-09-21):** see `docs/SPRINT_ROADMAP.md` § Profitability locks and `docs/PRODUCT_DESCRIPTION.md` §4.  

---

## 2. Current web app inventory

### Routes present

| Area | Routes | Reality |
|------|--------|---------|
| Marketing | `/`, `/pricing` | Usable shells; footer/legal `#` placeholders |
| Auth | `/login`, `/register`, `/reset-password`, `/update-password` | Email/password works; register allows open client (wrong for MVP) |
| Coach shell | `/dashboard`, `/clients`, `/clients/[id]`, `/sessions`, `/messages`, `/settings` | Mostly demo UI; messages stub; settings → missing Connect API |
| API | `POST /api/webhooks/stripe` | Partial; Connect onboarding API missing |
| Client product | — | **None** |
| Onboarding | — | **None** |

### Features folder

`apps/web/src/features/{auth,coach,client,payments}/` — **empty**. Logic lives in fat pages.

### Already in packages

- `packages/shared`: types, validators (`inviteClientSchema`, `checkoutSessionSchema`), payment fee helpers, motion tokens  
- `packages/ui`: Button, Input — barely used by web pages  

### Done / Partial / Not started (MVP)

| Capability | Status |
|------------|--------|
| Marketing landing + pricing | Done (shell) |
| Coach/client email auth | Partial |
| Onboarding (coach + invited client) | Not started |
| My Clients (real roster + invites) | Partial (demo list) |
| Client detail Snapshot/History/Analytics | Not started (placeholder) |
| Meal / training / body logging | Not started |
| Progress photos gallery | Not started |
| Calendar + booking accept/decline | Partial (sessions list only) |
| Messaging (Realtime) | Not started (stub page) |
| Notifications center | Not started |
| Tasks + notes | Not started |
| Company / subscription settings | Not started |
| Stripe Connect + checkout + receipts | Partial (webhook + helpers) |
| Client app shell | Not started |
| Vitest coverage / Playwright E2E | Not started in this repo layout |

---

## 3. Design coverage vs MVP

### Implement from existing HTML (`docs/OmniFit-Design-Screens/`)

- Marketing: Landing, Pricing (retarget tiers to Free/Pro), Contact, Docs  
- Auth: Login, SignUp (coach-only path)  
- Coach web: Dashboard, MyClients, ClientDetail/History/Analytics, LogTraining, ScheduleSession, CoachProfile  
- Client web (partial): ClientHome, ClientTraining, ClientCalendar, ClientProfile  
- Mobile pack: full logging, messages, invites, weekly check-in → use as reference for web parity  

### Designed but Phase 2 — do not build for launch

Find Coach, public coach profile, video lobby/call/summary, coach review/ratings, marketplace locations.

### Missing — design prompts in `CLAUDE_DESIGN_PROMPTS.md`

Checkout, receipt, booking inbox, tasks, notes, notifications, web messages, web invite-accept, pending invites, company settings, subscription/billing (Free/Pro), Privacy/Terms, web log hub/meal/metrics/saved meals, web workout library, web weekly check-in, web verify/reset, web empty/error, coach assign habits.

---

## 4. Target architecture (web)

```
apps/web/src/
  app/[locale]/
    (marketing)/     # landing, pricing, legal
    (auth)/          # login, register (coach), reset, invite accept
    (onboarding)/    # coach wizard, client invite onboard
    (app)/           # coach shell
    (client)/        # client shell
    api/             # stripe connect, webhooks, barcode lookup later
  features/
    auth/
    coach-home/
    coach-clients/
    coach-logging/
    coach-calendar/
    coach-tasks/
    coach-notes/
    coach-settings/
    client-home/
    client-logging/
    client-calendar/
    messaging/
    notifications/
    payments/
  components/shell/  # Sidebar, ClientTabBar
  lib/supabase|stripe|auth|feature-flags/
```

**Pattern:** thin `page.tsx` → `queries.ts` / `actions.ts` → `*Interactive` → `*View` (+ colocated `*.test.ts`).

**Feature flag:** marketplace off (`NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED=0`).

---

## 5. Phased delivery

### Phase A — Foundation (1–2 weeks)

| # | Task | Deliverable | Validate |
|---|------|-------------|----------|
| A1 | Design tokens from Design Doc | `assets/design-tokens.css` + Tailwind theme | Visual match to Design Doc |
| A2 | Feature folder scaffold + move first page | `features/coach-home` pattern | Lint/build |
| A3 | Auth: coach-only register; role redirect; invite gate for clients | Auth routes | Manual + unit |
| A4 | DB fix batch 1 (see DATABASE_FIX_PLAN) | Migrations 092+ | `migrate:check` / apply local |
| A5 | Vitest + coverage scripts + Playwright smoke skeleton | `test:coverage*` | CI green empty suite |

**Exit:** Tokens live; one real feature slice pattern; auth path matches invite-only MVP.

### Phase B — Coach roster loop (2–3 weeks)

| # | Task | DB / API | UI source |
|---|------|----------|-----------|
| B1 | Real My Clients list + archive | `coach_client_relationships` | Web-MyClients |
| B2 | Invite send / pending / resend / revoke | `client_invites` RPCs | Mobile-CoachInviteClient + new Pending Invites design |
| B3 | Client detail Snapshot | meals/workouts/habits aggregates | Web-ClientDetail |
| B4 | History + Analytics + progress photos | `progress_photos` storage | Web-ClientHistory / Analytics |
| B5 | Notes CRUD | `coach_notes` | New Notes design |
| B6 | Tasks CRUD | `tasks` | New Tasks design |
| B7 | Company settings (personal org) | `organizations` | New Company settings design |

**Exit:** Coach invites client → sees real data in Snapshot/History/Analytics; can note/task.

### Phase C — Client product (2–3 weeks)

| # | Task | Notes |
|---|------|-------|
| C1 | Client shell + home | Calories, habits, upcoming session |
| C2 | Invite accept + onboard (goal/metrics) | No Find Coach |
| C3 | Log meal + saved meals + add product (manual) | No desktop barcode |
| C4 | Log training + templates | Shared sport field matrix |
| C5 | Log body + required front/side/back photos | Storage bucket exists |
| C6 | Weekly check-in | Needs `weekly_checkins` table |
| C7 | Coach assign habits | Coach UI on client detail |

**Exit:** Invited client can log meal/training/body; coach sees it.

### Phase D — Scheduling & messaging (2 weeks)

| # | Task | Notes |
|---|------|-------|
| D1 | Client request session | `create_coaching_booking_request` |
| D2 | Coach accept/decline + message | Booking inbox design |
| D3 | Calendar day/week/month | Web-ScheduleSession + Mobile-Calendar |
| D4 | Messaging inbox + thread + Realtime | Web Messages design |
| D5 | Notifications center + badges | Needs `notifications` table |

**Exit:** Booking confirmed on both calendars; chat works live.

### Phase E — Payments MVP (1–2 weeks)

| # | Task | Notes |
|---|------|-------|
| E1 | Stripe Connect onboarding API + Settings CTA | **“Stripe handles pricing”**; fill missing `/api/stripe/connect` |
| E2 | Client checkout UI | Session/package price + tier service fee + total |
| E3 | Checkout session create (`createConnectCheckout`) | Direct charge on connected account + `application_fee_amount` (not destination charge that dumps Connect fees on platform) |
| E4 | Webhook → `payments` + session paid | Existing webhook harden |
| E5 | Acquisition fee only if `platform_sourced` | MVP invites = never $15 invoice; unpaid → **block** |
| E6 | Receipts (client + coach net) | Receipt design |

**Exit:** Paid session with tier service fee; coach Connect onboarded (**handles pricing**); Free tier 3-client cap enforced (`089_coach_tier_limits`).

### Phase F — Beta polish (1–2 weeks)

| # | Task |
|---|------|
| F1 | Pricing page Free/Pro (+ Team coming); hide marketplace CTAs |
| F2 | Privacy + Terms pages + SEO metadata |
| F3 | Empty/error/session-expired web states |
| F4 | Playwright E2E: invite → log → booking → pay smoke |
| F5 | pgTAP critical RLS; coverage gates ≥80% touched/MVP |

**Exit:** Demo-ready coach↔client loop without marketplace/video/facility.

---

## 6. Critical path

```text
A tokens+auth+DB hygiene
  → B invites+roster+analytics
  → C client logging
  → D booking+messaging
  → E Stripe checkout
  → F beta QA
```

Parallel: Claude design for P0 screens during Phase A–B (do not block coding on already-designed screens).

---

## 7. Testing strategy

| Layer | Tool | Gate |
|-------|------|------|
| Unit / component | Vitest + RTL in `apps/web` | Touched ≥80%; MVP aggregate ≥80% |
| Shared | `packages/shared` `*.test.ts` | Every changed export |
| RLS | pgTAP in `bd-scripts/tests/` | relationships, payments, invites |
| E2E | Playwright | Auth, invite, log meal, booking, checkout smoke |

Restore scripts expected by DEV plan: `test:coverage`, `test:coverage:touched`, `test:coverage:global`, `docs/COVERAGE_POLICY.md`.

---

## 8. SEO (marketing only)

- Unique title/description/OG on Landing, Pricing, Legal  
- `noindex` on authenticated app routes  
- Align Pricing copy to Free/Pro before indexing  
- Sitemap + robots for marketing routes only  

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Design assumes open signup / Find Coach | Invite-only routes; feature-flag marketplace |
| Schema includes RocketPlay/courts | No MVP UI; ignore those tables |
| Stripe vs DEV “payments Phase 2” | PRODUCT_DESCRIPTION wins — ship Connect in Phase E |
| Empty features/ + fat pages | Enforce slice pattern from Phase A |
| No tests in apps/web today | Scaffold in A5 before feature volume |
| RLS `auth.uid()` perf | DATABASE_FIX_PLAN batch 1 |

---

## 10. MVP acceptance checklist

- [ ] Coach: signup → onboard → invite → real roster → log training → accept booking → message → Connect Stripe → paid session  
- [ ] Client: accept invite → onboard → log meal/training/body+photos → request session → pay (price + tier service fee) → message
- [ ] Free tier blocks 4th active client  
- [ ] Marketplace / video / facility UI unreachable  
- [ ] Coverage + pgTAP + Playwright smoke green  

---

## 11. Explicitly not in this plan

- Cal.com integration  
- Live WebRTC / in-call log  
- Find Coach marketplace  
- Team multi-coach workspace  
- Courts / facilities / RocketPlay product UI  
- Expo mobile app (mirror after web beta)  
- AI form analysis / async video  

---

## 12. Next actions

1. Review [`DATABASE_FIX_PLAN.md`](./DATABASE_FIX_PLAN.md) and [`CLAUDE_DESIGN_PROMPTS.md`](./CLAUDE_DESIGN_PROMPTS.md)  
2. Run missing P0 prompts in Claude Design; drop HTML into `docs/OmniFit-Design-Screens/`  
3. Start Phase A in a feature branch (`feat/mvp-foundation`)  

**Estimated total (web MVP):** ~10–14 weeks with 1–2 engineers (Phases A–F).
