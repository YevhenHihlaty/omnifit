# OmniFit — Product Description (Design Input)

> **Purpose:** Single source for product scope, behavior, integrations, and monetization. Use this document to derive a design system, marketing site, web app, and mobile app. **No visual design direction** is specified here.  
> **Last updated:** September 2026  
> **Related:** [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) · [`BUSINESS_PLAN.md`](BUSINESS_PLAN.md)

---

## 1. Product summary

OmniFit is a **coach-first** platform for **independent fitness coaches** to run **all clients in one application**: roster, scheduling, payments, progress tracking, messaging, and tasks. Clients use the product **free** for logging and communication; coaches pay **platform subscriptions** and receive **session payments directly** from clients.

**Launch focus:** Solo coach + **invite-only** clients. Public coach marketplace, gyms/facilities, and multi-coach studio admin are **later phases**.

**Product name:** OmniFit (working name; repository may use Coachr).

---

## 2. Users and roles

| Role | Description |
|------|-------------|
| **Coach** | Primary customer. Manages roster, schedule, pricing, gets paid by clients, pays platform subscription and applicable platform fees. |
| **Client** | End user paired with one or more coaches (MVP: typically one primary coach). Logs nutrition, training, body metrics; books and pays for sessions. |
| **Platform (operator)** | Runs marketing site, billing for coach subscriptions, transaction service fees, and optional client-acquisition fees. |

**MVP excludes:** gym operators, facility managers, studio front-desk staff, multi-coach org admins (Phase 3+).

---

## 3. Technical platform (build stack)

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Web app & marketing** | **Next.js on Vercel** | Public website, coach/client authenticated product UI, server actions/API routes, webhooks entrypoint |
| **Mobile apps** | React Native + Expo (iOS/Android) | Native coach and client apps; same backend as web |
| **Backend** | **Supabase** | PostgreSQL database, Auth (email), Row Level Security, Realtime (chat, live session signals), Storage (progress photos), Edge Functions |
| **Scheduling** | **Native** (`booking_requests` / `sessions`) | Coach availability, booking request → approve/decline → session. **No Cal.com Platform API** (avoids $299–$2,499/mo). Optional later: coach-owned / self-hosted Cal.com sync — never platform-billed Cal.com Platform |
| **Payments** | **Stripe** | Coach **subscriptions** (Billing); **Stripe Connect** with **“Stripe handles pricing”** — clients pay coaches via direct charges; platform takes **application fees** only; **$0** Connect account/payout fees to OmniFit |

**Cross-cutting:** Shared types and validation (e.g. Zod) across web and mobile; email for invites and transactional messages.

---

## 4. Monetization and payments

> **Profitability locks (2026-09-21):** Connect **“Stripe handles pricing”**; Free **3** clients; Pro **$29/mo** (~15% off annual); **tier-dependent** service fee; acquisition **$15** invoice (testable hypothesis); failed acquisition → **block**; **no** Cal.com Platform API. Details also in `docs/SPRINT_ROADMAP.md` → Profitability locks.

### 4.1 Revenue streams (platform)

1. **Coach subscription plans** (recurring, billed to coach via Stripe Billing) — Pro **$29/month**.
2. **Per-transaction service fee (tier-dependent):** added to every **in-app** client → coach payment (sessions, packages, coach-sold subscriptions) — Free coaches **$1.50**, Pro coaches **$0.50** (see 4.3). Never on `direct` / offline / $0 free sessions.
3. **Client acquisition fee (conditional):** **USD $15** **invoice** to the **coach** when the client is **`platform_sourced`** (Phase 2). Amount is a **pricing hypothesis** — re-test ($19–$29 or capped take-rate) before public Find Coach traffic. Never auto-debit the client’s card.

Clients do **not** pay a platform subscription.

### 4.2 Coach subscription tiers (locked commercial settings)

| Tier | Price | Limits |
|------|-------|--------|
| **Free** | $0 | Cap **3** active clients (that coach’s pairings); core roster, logging, messaging, native scheduling |
| **Pro** | **$29/month** (~**15%** off annual) | Unlimited (or high-capped) clients; nutrition / scheduling / payments / messaging bundled; analytics depth; live video + in-call logging (Phase 2); marketplace listing eligibility (Phase 2) |
| **Team** | Coming soon | Phase 3+ — not part of initial launch scope |

### 4.3 Client → coach payments (Stripe Connect — “Stripe handles pricing”)

**Model:** **Direct charges** on the coach’s Connect account with OmniFit **`application_fee_amount`**. Stripe is the **pricing controller** — OmniFit pays **$0** Connect active-account and per-payout fees. Coach still bears standard card processing (billed by Stripe). Avoid “you handle pricing” (would cost ~$2/mo + payout fees per active connected coach).

| Party | Pays | Receives / bears |
|-------|------|------------------|
| **Client** | Session/package price set by coach **+ tier-dependent platform service fee** | Session / product with coach |
| **Coach** | **Stripe processing fees** (billed by Stripe under handles-pricing) | Net after Stripe fees |
| **Platform** | **$0** Connect account/payout fees | Application fee: Free **$1.50** / Pro **$0.50** per in-app paid charge |

**Requirements:**

- Coach completes **Stripe Connect onboarding** (handles-pricing configuration) before accepting **in-app** paid bookings.
- Coach configures session/package products/prices in OmniFit.
- Service fee applies to **sessions, packages, and coach-sold subscriptions** sold in-app — not sessions only.
- Every successful client payment generates a **receipt** showing: product amount, **service fee** (tier amount), total charged, coach net (coach-facing view shows Stripe fee deduction).
- Refunds and disputes follow Stripe rules; service fee reversal policy documented in admin.

**Free sessions:** Session price $0 → no client charge and no service fee.

### 4.4 Client acquisition fee ($15 invoice)

**Rule:** When the platform **sources** the client (`platform_sourced`), OmniFit creates a **$15 invoice** to the **coach** (default amount; re-test before Phase 2). **Coach-invited** pairings never invoice. Failed / unpaid invoice → **block** pairing activation / booking — **no debt banner**.

| Client origin | Acquisition fee |
|---------------|-----------------|
| **Coach invite** (`coach_invited`) | None |
| **Platform acquired** (`platform_sourced`) | **$15 invoice** to coach (hypothesis — may rise to $19–$29 or capped take-rate after CAC test) |

**Platform-sourced examples (Phase 2+):** Find Coach marketplace, marketing funnel, or platform referral.

**Coach-invited examples (MVP):** email invite from My Clients.

**Implementation notes:**

- Persist `acquisition_source` on pairing at creation; immutable.
- Create Stripe Invoice to coach when `platform_sourced` pairing would activate; track `draft | open | paid | void`.
- If unpaid / charge fails → **block** — do not accumulate debt banners across coaches.
- Never charge the client’s card for acquisition; never invoice `coach_invited`.

### 4.5 Scheduling + payments (native)

- MVP booking is **native** (request → coach approve → pay in-app or direct). Payment status from Stripe webhooks → `sessions` / `payments`.
- **Cal.com Platform / embed API is out** of MVP (unit-economics risk). Optional later sync with coach-owned or self-hosted Cal.com does not change Connect fee model.

---

## 5. Authentication and access

| Capability | Coach | Client |
|------------|-------|--------|
| Sign up | Email + password; email verification | **Invite-only (MVP):** no open registration |
| Login / logout | Yes | Yes |
| Password reset | Yes | Yes |
| Role | Fixed at coach signup | Set from invite metadata |

**Client invite flow (MVP):**

1. Coach sends invite from **My Clients** (email).
2. Coach sees pending invites; can resend or revoke.
3. Client opens invite link, sets password, completes onboarding.
4. System creates profile, client record, and **active coach–client relationship** with `acquisition_source = coach_invited`.

---

## 6. Onboarding

### Coach onboarding

- Skippable steps where noted; completion creates **personal organization record** (billing limits, future Team support — no studio UI in MVP).
- Collect: display name, bio, specialties, timezone, **training plans offered** (names/descriptions), credentials (certificates, education, work experience).
- **Stripe Connect** onboarding step before accepting **in-app** paid bookings (can be deferred until first paid offer) — configure **“Stripe handles pricing”**.
- **Scheduling:** define default session types and duration in OmniFit (native). No managed Cal.com Platform profile.

### Client onboarding (invited)

- Accept invite → account → goals, baseline metrics, optional profile photo.
- Pairing to inviting coach is automatic.

---

## 7. Coach features

### 7.1 Home

- Today’s schedule (from native sessions / booking requests).
- Counts: active clients, sessions in last 30 days, open tasks.
- Shortcuts: My Clients, calendar, pending booking requests.

### 7.2 My Clients (roster)

- Single list of all active clients; archive and restore.
- **Invite client** by email (pending list).
- Per-client detail with tabs:
  - **Snapshot:** daily adherence — calories, workouts logged, habits completed.
  - **History:** filterable timeline (meals, training, body metrics, photos, notes).
  - **Analytics:** adherence score, weight trend, body measurements, training volume, **progress photo gallery** (front/side/back), compare two check-ins.

### 7.3 Log training (coach)

- Log on behalf of selected client.
- **Sport types:** weight lifting, general fitness, running, cycling, swimming.
- **Per sport:** modality-specific fields (reps, weight, duration, distance, RPE, intervals, etc.) — same schema for coach log, client self-log, and later in-call log.
- Exercise picker: search catalog, recents, saved workout templates; add custom exercise to personal library.
- Save session to client history; optional link to calendar session.

### 7.4 Workout library

- Save workout templates (exercises + sport type + optional default sets).
- Start new log from template; update template from completed session.

### 7.5 Calendar and scheduling (native)

- Views: day, week, month.
- **Availability and bookable session types** managed in OmniFit (source of truth). Optional later: coach-owned Cal.com sync — not Platform API.
- **Booking request flow (in-app):** client proposes time → coach accept/decline with optional message → confirmed session on both calendars.
- **Paid sessions:** client checkout per coach pricing; payment required per coach policy (e.g. pay at booking or before session).
- Show payment status on session row (paid, pending, refunded).

### 7.6 Tasks and notes

- **Tasks:** create, edit, complete, delete; optional link to client; due date; type/category.
- **Notes:** free text; optional client link; create after session or ad hoc.

### 7.7 Profile and practice settings

- Training plans list (offerings).
- Certificates, education, work experience.
- Notification preferences.
- Account settings (email, password).
- **Company / practice settings:** legal/display name, slug, description (internal scaffold for limits and billing).
- **Payouts:** Stripe Connect dashboard link; payout status.
- **Subscription:** current plan, upgrade/downgrade, billing portal (Stripe Customer Portal).

### 7.8 Messaging

- One thread per coach–client pair (or unified inbox with client picker).
- Real-time delivery via Supabase Realtime.
- Message types: text; optional system events (booking confirmed, payment received, new progress photos).

### 7.9 Notifications (in-app; push Phase 2)

- New messages, booking requests, booking decisions, new client progress photos, payment success/failure, subscription issues.

### 7.10 Live coaching (Phase 2)

- **1:1 live video** in app (WebRTC); **no recording**, no async video upload.
- **In-call training log:** coach logs each set live; client sees live summary; on end, workout saved to history linked to call record.

### 7.11 Public profile and discovery (Phase 2)

- **Find Coach** browse and filters.
- Public coach storefront: bio, plans, credentials, reviews/ratings.
- Clients from marketplace create pairing with `acquisition_source = platform_sourced` → **$15 acquisition invoice** to coach; unpaid → **block** activation.

---

## 8. Client features

### 8.1 Home

- Calorie progress vs goal.
- Today’s habits (coach-assigned).
- Upcoming sessions.
- Quick actions: log meal, log training, log body metrics.
- Link to coach (MVP: assigned coach only).

### 8.2 Daily habits

- Coach-assigned goals (e.g. steps, water, sleep target).
- Daily check-off; coach sees completion in snapshot/analytics.

### 8.3 Logging hub

**Meals**

- Log meal with type (breakfast, lunch, etc.) and time.
- Search foods; recent foods; saved meals (one-tap log again).
- **Barcode scan** (mobile native + mobile web): lookup local catalog → Open Food Facts → prompt to add product if missing.
- Add custom product (with or without barcode); barcode-backed products can enter shared catalog; manual private products stay user-only.
- Macro totals: calories, protein, carbs, fat per day.

**Training**

- Self-log workouts (same sport types and fields as coach).
- Saved workout templates and custom exercises.

**Body metrics**

- Weight and optional measurements.
- **Required progress photos:** front, side, back — all three required before save.
- Photos stored per check-in; visible to coach in analytics and history.

### 8.4 Calendar and booking

- View upcoming and past sessions with coach.
- Request new session (propose slot); await coach response.
- **Pay for session** when required: sees session price + **tier-dependent service fee** (Free coach **$1.50** / Pro coach **$0.50**) at checkout.
- Join live video session (Phase 2) from calendar entry.

### 8.5 Profile and progress

- Goals.
- Progress charts and photo timeline.
- Full history of logs.
- **Weekly check-in** (e.g. Sunday): sleep, soreness, stress, energy (scale 1–5).

### 8.6 Messaging

- Chat with paired coach(s).

### 8.7 Find a new coach (Phase 2)

- Browse marketplace; view profiles; request booking — triggers platform-sourced acquisition rules when applicable.

---

## 9. Shared platform behavior

| Area | Behavior |
|------|----------|
| **Security** | RLS on all tables; coaches only see data for active relationships; signed URLs for photos |
| **Realtime** | Chat; booking updates; live call signaling (Phase 2); optional live workout draft channel |
| **Email** | Invites, password reset, booking confirmations, payment receipts |
| **Marketing website** | Landing, pricing, coach signup, legal pages; deployed on Vercel |
| **Feature parity** | Web and mobile share same core flows; desktop web may omit camera barcode (manual food entry only) |

---

## 10. Smart catalogs (MVP)

**Foods:** global catalog + user private items + barcode contributions; Open Food Facts enrichment.

**Exercises:** global + user-created; sport type and default field masks; usage ranking in search.

**Saved meals and workout templates:** per-user (coach or client owner).

**Training locations / gyms:** Phase 3+ — not MVP.

---

## 11. Phase roadmap (feature gates)

### MVP (launch)

- Coach auth, subscription scaffolding (Free tier: **3** active clients).
- Client **invite-only** access.
- My Clients roster, analytics, progress photos, logging (coach + client), habits, weekly check-in.
- **Native** scheduling + in-app calendar + booking accept/decline (no Cal.com Platform API).
- **Stripe Connect (“Stripe handles pricing”)** + client checkout with **tier-dependent** service fee; coach pays Stripe card fees; **no acquisition invoice** for coach-invited clients.
- Messaging, in-app notifications.
- Marketing site + web product; mobile apps aligned with MVP flows.

### Phase 2

- Coach **Pro** subscription at **$29/mo** (Stripe Billing; ~15% off annual).
- Find Coach + public storefront; **platform_sourced** clients + **$15 acquisition invoice** (re-test amount vs CAC before public traffic); failed invoice → **block**.
- Live 1:1 video + in-call logging.
- Push notifications.
- Coach ratings after sessions.
- Optional: coach-owned Cal.com sync (not Platform API).

### Phase 3+

- Team / multi-coach organizations, staff roles, org calendar.
- Gym/facility location catalog.
- Group live classes (multi-participant video).
- Wearables, exports, API, white-label.

---

## 12. Explicitly out of product scope

- Stored or async **workout video** uploads from clients.
- **Cloud recording** of live calls.
- **AI movement / form analysis**.
- Gym/facility **operator** tools in MVP (court booking, venue marketplace).
- Client-paid **platform subscription**.

---

## 13. Key entities (for design information architecture)

| Entity | User-facing concept |
|--------|---------------------|
| Coach profile | Coach identity, credentials, plans, Connect status |
| Client profile | Goals, metrics, logs |
| Coach–client relationship | Pairing, active/archived, **acquisition source** |
| Session / booking | Time, status, payment status |
| Payment | Amount, service fee (tier), Stripe ids, refund state |
| Workout / meal / body log | Client or coach-authored entries |
| Progress photo set | Three poses per body log |
| Conversation / message | Coach–client chat |
| Task / note | Coach productivity |
| Subscription | Coach plan tier and Stripe subscription |
| Invite | Pending client email invite |

---

## 14. Payment UX copy (factual labels for design)

Use clear labels in checkout and receipts:

- **Session price** — set by coach.
- **Platform service fee** — **$1.50** (Free coach) or **$0.50** (Pro coach); paid by client on in-app checkout.
- **Total due today** — session/package + service fee.
- Coach payout view: **Stripe processing fee** (variable), **net payout**.
- **Platform introduction fee** — **$15.00** invoice to coach (when client came from platform discovery) — show before pairing activates; unpaid → booking blocked.

---

## 15. Resolved / remaining product decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | Pay timing | **Locked:** booking request → coach approve → then pay (`in_app` or `direct`) — not pay-at-booking via Cal.com |
| 2 | Service fee on packages / coach subscriptions | **Locked:** yes — same tier-dependent fee as sessions |
| 3 | Currency | USD first; multi-currency later |
| 4 | Tax/VAT display on client checkout | Still open (implementation) |
| 5 | Failed acquisition charge | **Locked:** **block** booking / pairing — no debt banner |
| 6 | Cal.com tenancy | **Locked:** no Cal.com Platform API; native booking. Optional later coach-owned/self-hosted sync only |
| — | Connect pricing model | **Locked:** **Stripe handles pricing** |
| — | Pro / Free caps | **Locked:** Pro **$29/mo**; Free **3** clients |
| — | Acquisition amount | **$15** invoice default; **hypothesis** — re-test before Phase 2 Find Coach |

---

*This document intentionally excludes colors, typography, layout, motion, and component styling so a design system and UI can be created separately.*
