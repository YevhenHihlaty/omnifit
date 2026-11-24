# OmniFit — Full Development Plan

> **Version:** 3.0 · **Date:** September 2026 · **Tagline:** One app for your whole roster.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [MVP Scope](#3-mvp-scope)
4. [Screen Inventory](#4-screen-inventory)
5. [System Architecture](#5-system-architecture)
6. [Database Schema](#6-database-schema)
7. [Project Structure](#7-project-structure)
8. [Feature Specifications](#8-feature-specifications)
9. [Design System](#9-design-system)
10. [Phased Delivery](#10-phased-delivery)
11. [Sprint Breakdown](#11-sprint-breakdown)
12. [Critical Path](#12-critical-path)
13. [Team & Roles](#13-team--roles)
14. [Investor Milestones](#14-investor-milestones)
15. [Risk Register](#15-risk-register)
16. [Testing Strategy](#16-testing-strategy)
17. [Security](#17-security)
18. [Post-MVP Roadmap](#18-post-mvp-roadmap)
19. [KPIs](#19-kpis)
20. [Running Costs](#20-running-costs)

---

## 1. Executive Summary

**OmniFit** is a **coach-first** platform: one independent coach manages **all clients** in a single app — roster, schedule, logs, progress photos, messaging, and tasks. Clients are **invite-only** and use the app free.

| Dimension | Decision |
|-----------|----------|
| **MVP persona** | **Solo independent coach** — not gyms, facilities, or multi-coach studios |
| **Client growth** | **Email invite** from My Clients (no open client signup; no Find Coach in MVP) |
| **Mobile** | **iOS & Android — React Native + Expo Router** (native apps; **local builds only**, no paid EAS) |
| **Web** | **Next.js — marketing + full product** (landing, pricing, auth, coach & client UI). **Mobile web:** camera barcode scan (W-CL05a). **Desktop web:** search + manual add only |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| **Live video** | **WebRTC in-app** (Phase 2) — `react-native-webrtc` + **Supabase Realtime** signaling; **Cloudflare Realtime TURN** for NAT traversal |
| **Engineering** | 2–3 engineers + part-time designer |
| **MVP** | ~20 weeks (**Sprints 1–20** on web-first track) |
| **Public launch** | ~32 weeks (**through Sprint 24** + store prep) |
| **Execution** | **`docs/SPRINT_ROADMAP.md`** — sprint goals, work items, status |
| **Business plan** | **`docs/feature-overview-for-coaches-and-partners.md`** (coach-first MVP; gyms/facilities deferred) |

---

## 2. Product Vision

### Problem

Independent coaches use 4–6 disconnected tools: spreadsheets, WhatsApp, Calendly, MyFitnessPal, Drive for photos, Zoom. There is **no single roster** with shared history per client.

### Solution

One app where the coach sees **every client** in **My Clients**, reviews logs and **body progress photos** in analytics, schedules sessions, and messages — while clients log meals, training, habits, and check-ins. **Live 1:1 video** (Phase 2) replaces Zoom; **in-call training log** replaces paper/Notes. No async video uploads, cloud recordings, or AI analysis.

**MVP does not include:** gym/facility directories, venue booking, public coach marketplace, or multi-coach studio admin — those ship in Phase 2–3 after the solo-coach loop is proven.

### Design Direction

- **Tone:** Warm, professional, calm — scannable daily operations tool
- **Palette:** Warm paper backgrounds, deep charcoal text, performance green accents
- **Typography:** Hanken Grotesk, tabular-nums on all metrics
- **Motion:** 150ms press feedback, 350ms page enter, `prefers-reduced-motion` respected

See `docs/design/google-stitch-prompts-website.md`, `docs/design/google-stitch-prompts-mobile.md`, and `docs/SCREEN_INVENTORY.md`.

---

## 3. MVP Scope

### In MVP (coach-first)

- **Auth:** coach signup, login, reset, email verification; **clients invite-only** (Concept v3) — no open client register
- **Client invites:** send from My Clients; pending / resend / revoke; accept link → password → client onboarding
- **Onboarding:** coach (profile, plans, credentials — **skip gym/location catalog**); invited client (goal + metrics + photo)
- **Personal org scaffold:** auto-create `organizations(kind=personal)` for client caps / future billing — **no Team UI, no workspace switcher**
- **Coach:** Home, **My Clients (full roster)**, client analytics (incl. progress photo gallery), log training (incl. log-on-behalf), calendar, profile (plans, credentials — **not** public storefront), tasks, notes
- **Client:** Home, logging hub, calendar with **their coach**, profile (goals, progress, check-ins) — **no Find Coach browse**
- **Progress photos:** front/side/back on Log Body Metrics; coach gallery on Client Analytics + history
- **Scheduling:** booking request → accept/decline with **existing** coach–client pairings
- Messaging + in-app notifications (incl. new progress photos)
- **Marketing site (Next.js):** landing, pricing, **coach** signup/login
- **Web product (Next.js):** coach & client flows at feature parity with mobile targets; barcode on mobile web only
- Empty + error states

### Phase 2 (growth + monetization)

- **Find Coach** marketplace + public coach profile / storefront (feature flag until ready)
- WebRTC **1:1 live sessions** — live only, no recording
- **In-call training log** linked to `video_calls`
- Stripe **Pro**, push notifications, coach ratings

### Phase 3+ (studios, gyms & facilities — not MVP)

- **Training locations & `places` catalog** (gyms, studios, parks) for profile + marketplace filters
- **Team plan & organizations** — multi-coach studio workspace, staff roster, org calendar, book-for-coach, partner comp
- **Facility / venue patterns** (reservations, courts — separate from solo-coach MVP)
- **Group online training** (SFU, up to 20 participants)
- Wearables, white-label, coach API

**Explicitly out of scope (all phases):** AI form analysis, async client video uploads, `form_feedback` queues, cloud call recording

---

## 4. Screen Inventory

**~86 native mobile views** (implementation target) documented in `docs/SCREEN_INVENTORY.md` and `docs/design/google-stitch-prompts-mobile.md`:

- **Mobile (MVP):** auth, onboarding, coach (20), client (20), system (8), live video (3, Phase 2 — call + in-call log)
- **Mobile (Phase 3):** team owner workspace (TM01–TM09), workspace switcher (WS01)
- **Website (MVP):** marketing (W01, W08 pricing) + auth (W02–W07) + **coach/client product UI** (W-CH*, W-CL*, WEB-*) — see `google-stitch-prompts-website.md`
- **Website vs mobile:** same features and Supabase backend; **desktop web** omits barcode scanner (manual product entry); **mobile web** includes barcode scan (PRD `.claude/prds/web-barcode-scanner.prd.md`)

Shared design tokens: `assets/design-tokens.css` · brand: `docs/brand-guidelines.md`

---

## 5. System Architecture

### Platform split

| Surface | Stack | Role |
|---------|-------|------|
| **iOS / Android** | Expo + React Native + Expo Router | Native coach & client apps (camera barcode, push, native WebRTC) |
| **Web** | Next.js on Vercel | Marketing + **full coach/client product** (responsive; mobile web scan, desktop manual food entry) |
| **Backend** | Supabase | Shared auth, data, Realtime, Storage |

```
Expo / React Native (Coach + Client) — apps/mobile/
         │
         ▼
    Supabase Platform
    ├── Auth (PKCE, email verify, deep links)
    ├── PostgreSQL + RLS
    ├── Realtime (messages, calendar, WebRTC signaling)
    ├── Storage (progress photos, profile images, cert PDFs — **no client video in MVP**)
    └── Edge Functions (analytics, TURN credentials, call hooks)
         │
         ▼
    Phase 2: WebRTC (react-native-webrtc), TURN, Stripe, FCM/APNs

Next.js (marketing + product) — frontend/  ──► Vercel  ──► same Supabase project as mobile
```

### Mobile build & release (local only — $0 Expo)

OmniFit **does not use EAS paid tiers** or rely on EAS cloud builds. Year‑1 Expo cost: **$0**.

| Step | Command / tool |
|------|----------------|
| Dev | `npx expo start` |
| Native projects | `npx expo prebuild` (when adding native modules e.g. WebRTC) |
| Local run | `npx expo run:ios` · `npx expo run:android` (requires Xcode / Android Studio) |
| iOS store | Archive in Xcode → TestFlight / App Store Connect |
| Android store | `./gradlew bundleRelease` → Play Console upload |
| OTA updates | **App store releases only** (no EAS Update) |
| Optional CI | Self-hosted Mac mini or manual releases (GitHub macOS runners consume paid minutes) |

**Requirements:** Mac with Xcode for iOS builds; any OS for Android. Apple Developer ($99/yr) + Play ($25 once) for store distribution.

### WebRTC live calls (Phase 2 — Cloudflare Realtime SFU)

> **Supersedes earlier P2P-only guidance.** Web track uses **Cloudflare Realtime SFU + TURN** for call quality. P2P remains available behind `NEXT_PUBLIC_VIDEO_TRANSPORT=p2p`. See `docs/plans/OMNIFIT_REWRITE_AND_WEBRTC_PLAN.md`.

```
Coach / Client (web or native)
    │
    ├─ RTCPeerConnection ↔ nearest Cloudflare Realtime edge (SFU)
    │     publish local tracks · subscribe remote tracks · simulcast
    │
    ├─ SDP / session API ──► Next.js /api/video/* (server holds APP_SECRET)
    │
    └─ Call lifecycle ──► Supabase `video_calls` + Realtime
                          in-call log draft: call:{id}:workout_draft

STUN: stun.cloudflare.com (free)
TURN: Cloudflare Realtime TURN — short-lived credentials from GET /api/video/ice
Recording: never enabled
```

**Why SFU (not P2P-only):** worse uplink no longer dictates both directions; deterministic connect via anycast; path to Phase 3 group calls. Cost bounded by 720p / 1.2 Mbps send cap.

**In-call training log (Phase 2):** Coach opens bottom sheet / side panel during `V02`. **Log every set live** as completed — each set write broadcasts on Realtime (`call:{id}:workout_draft`); client banner updates immediately. Reuses offline logging schema (5 sport types, dynamic fields). On call end → confirm → persist `workouts` + exercises + sets with `source = live_session` and `video_call_id`. No video bytes stored.

**Group sessions (Phase 3 — design only):** Same Cloudflare Realtime API for ≤20 participants; budget egress separately.

**Limits to plan for:** no cloud recording (live-only policy); background iOS/Android call UX needs native modules.

### Critical Flows

**Booking:** Client requests slot → coach accept/decline → session created → Realtime sync

**Progress photos:** Client logs body metrics + front/side/back photos → coach sees gallery on Analytics tab + history entry → optional text feedback via messaging

**Live session + in-call log (Phase 2):** Calendar session or ad-hoc call → WebRTC connect → coach logs sets in panel → end call → workout persisted to client history

**Analytics:** Nightly Edge Function aggregates adherence, trends → cached snapshots

---

## 6. Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Base user (extends auth.users) |
| `coach_profiles` / `client_profiles` | Role-specific data; coach: **`source_organization_id`**, **`current_organization_id`**, **`preferred_workspace_id`** (optional), **`personal_subscription_tier`** (`free` \| `pro`) |
| `organizations` | **Every coach’s company** — `kind`: `personal` (auto at onboarding) or `team` (studio); limits + billing |
| `organization_members` | Roster + membership lifecycle (`invited` → `active` → `removed`) |
| `organization_member_limits` | Optional per-coach overrides on team orgs |
| `organization_invites` | Pending email invites |
| `partner_entitlements` | Audit log for comped access |
| `coach_client_relationships` | Active/archived pairings |
| `training_plans` | Coach programs on profile (**MVP**) |
| `coach_places` → `places` | **Phase 3+** — gym/facility catalog + coach links (not MVP) |
| `exercises`, `workout_templates`, `workout_template_items` | Global exercise catalog + coach/client saved workouts |
| `saved_meals`, `saved_meal_items` | Client (or coach) one-tap meal combos |
| `certificates`, `work_experience`, `education`, `achievements` | Credentials |
| `sessions`, `booking_requests` | Scheduling |
| `workouts`, `workout_exercises`, `workout_sets` | Training logs |
| `meals`, `meal_items`, `food_products`, `food_product_barcodes` | Client nutrition tracking — meals with line items; barcode-backed product catalog |
| `body_metrics`, `progress_photos` | Client tracking (`progress_photos`: front/side/back per body-metrics log) |
| `daily_habits`, `habit_completions` | Coach-assigned goals |
| `weekly_checkins` | Sunday subjective forms |
| `messages`, `conversations`, `notifications` | Comms |
| `video_calls`, `webrtc_signals` | Live 1:1 sessions (**Phase 2** — signaling only; **no stored media**) |
| `tasks`, `notes` | Coach productivity (MVP Draft) |

**Company model (all coaches):**

| Concept | Storage | Rules |
|---------|---------|-------|
| **Source company** | `coach_profiles.source_organization_id` → `organizations` where `kind = personal` | Created once at onboarding; **immutable** |
| **Current company** | `coach_profiles.current_organization_id` | Active workspace; switchable between source and team orgs while member |
| **Preferred workspace** | `coach_profiles.preferred_workspace_id` | Last chosen workspace (restore on login) |
| **Personal plan** | `coach_profiles.personal_subscription_tier` | Free/Pro **you pay for**; restored when leaving a studio |
| **Effective entitlements** | Resolved in app/RLS | Team when `current` is active team org; personal tier when `current = source` |

**RLS:** Every table scoped by `auth.uid()`; coaches read client data only via active relationship in **current company** context. **Org tables:** members see org data when `organization_members.status = active` and role permits.

**Migrations:** Ordered DDL in `bd-scripts/migrations/` — apply matrix for dev/staging/prod in `bd-scripts/MIGRATION_APPLY_MATRIX.md` (001–015). Verify: `npm run migrate:check`.

---

## 7. Project Structure

```
coachr/
├── apps/
│   ├── mobile/          # Expo Router — React Native product (auth, coach, client, onboarding)
│   │                    # Build: expo prebuild + local run / Xcode / Gradle (no EAS)
│   └── web/             # Next.js — marketing, pricing, auth → app deep links only
├── packages/
│   ├── shared/          # Types, Zod validators, motion tokens (consumed by mobile + web)
│   └── supabase/        # Migrations, Edge Functions, seed
└── docs/
```

**State (mobile):** TanStack Query + Zustand + React Hook Form + Zod (`@coachr/shared`)  
**State (web):** TanStack Query + React Hook Form + Zod (`@coachr/shared`); marketing pages stay static

---

## 8. Feature Specifications

### Coach Home
Today's schedule, quick stats (active clients, rating, 30d sessions), My Clients shortcut, top tasks widget.

### My Clients
Swipe-to-archive list. Detail tabs: Snapshot (calories, trainings, habits), History (filterable), Analytics (adherence ring, weight trend, measurements, progress gallery, volume chart).

### Coach Action
Log training (5 sport types, dynamic fields — see **Training Log Field Matrix** below). Same form offline and in-call. Visual progress lives under Client Detail → Analytics (photo gallery) and History. Live form coaching on Phase 2 video calls with **per-set** in-call logging (V02/V03).

### Coach Client Analytics
Adherence ring, weight trend, measurement chips, **week-over-week progress photo gallery** (front/side/back), volume chart. Coaches compare latest upload to prior check-in side-by-side.

### Coach Calendar
Day / Week / Month. Pending requests with accept/decline + message.

### Coach Profile
Tabs: Plans, Certificates, Experience, Education, Notifications, Settings, Company (source org metadata). **Locations / gym links — Phase 3+** (`places` catalog).

### Client Home
Search, calorie ring, daily habits, schedule, shortcuts to **their coach** (Find Coach / discovery carousel **Phase 2**).

### Client Action Hub
Log Meal · Log Training (exercises only — **no video in MVP**) · Log Body Metrics (measurements + **required progress photos**: front, side, back).

### Barcode Meal Logging (MVP — Sprint 5–6 extension)

**Why barcodes:** Manual calorie entry is error-prone; scanning packaged foods is faster and unlocks macro tracking (protein, carbs, fat) without a paid nutrition API.

**Lookup order (always local DB first):**

```
Scan EAN/UPC → normalize barcode → food_products.barcode lookup
    ├─ Hit → CL05b Product Detail (quantity → add to meal)
    ├─ Miss → Edge Function or Server Action: Open Food Facts API
    │    ├─ OFF hit → upsert product (`source = off`) → CL05b Product Detail
    │    └─ OFF miss → CL05a-not-found prompt (see below)
    └─ Manual "Add a product I use" → CL05c (no barcode, private item)
```

**Barcode not found — ask before form (CL05a → prompt sheet):**

Do not drop the user straight into a long form. After OFF miss:

1. Scanner pauses; soft haptic.
2. Bottom sheet: **"Product not found"** — show scanned barcode (read-only, tabular-nums, copy icon).
3. Copy: *"This barcode isn't in our catalog yet. Add it so you — and others — can log it next time."*
4. **Primary:** "Add this product" → CL05c with barcode **locked**.
5. **Secondary:** "Scan again" · Cancel.

Same **CL05c** form when user taps **"+ Add a product I use"** from meal search (no barcode) — barcode field hidden; item saves as **private** to their account (homemade / deli / no packaging).

**Add Product form (CL05c) — fields:**

| Field | Barcode path | Manual path |
|-------|--------------|-------------|
| Barcode | Pre-filled, read-only | Hidden |
| Product name | Required | Required |
| Brand | Optional | Optional |
| Serving size + unit | Required (e.g. `100` + `g`) | Required |
| Calories per serving | Required | Required |
| Protein / Carbs / Fat | Optional but encouraged | Optional |
| Save | Inserts `food_products` with barcode (`source = user`, shared read) | Inserts `food_products` only (`source = user`, private) |

**After save:** toast *"Product saved"* → CL05b Product Detail (quantity stepper) → add to current meal. Barcode contributions are **globally readable** on next scan by any user.

**Data model:**

| Table | Purpose |
|-------|---------|
| `food_products` | Name, brand, serving size, calories + P/C/F per serving, optional `barcode` + `barcode_type`, `source` (`off` \| `seed` \| `user`), optional `created_by` |
| `meals` | Meal header: client, meal type, logged_at, notes |
| `meal_items` | Line item: `product_id`, quantity (servings), computed macros snapshot |

**Catalog policy:**

- **Global read:** any authenticated user can search/scan products in the shared catalog
- **Barcode contributions:** when a user adds a product with a barcode, it enters the **shared catalog** immediately — the next person who scans that code gets it
- **Private products:** manual add without barcode (`created_by = auth.uid()`) — visible only to that user in search/recents
- **Edit rights:** creator can edit their `source = user` product until Phase 2 moderation; OFF/seed products are read-only (adjust servings per log only)
- **Coach view:** coaches read client `meal_items` via active relationship (same as meals today)
- **No paid barcode DB** — Open Food Facts for enrichment; user-submitted fills gaps

**Mobile (Expo) — Sprint 8b:**

- `expo-camera` barcode scanning (SDK 52+; `expo-barcode-scanner` deprecated)
- `expo prebuild` required for camera native module; local builds only ($0 Expo)
- Permissions: camera — reuse location-permission UX pattern (S03) for denied state
- Screens: **CL05** Log Meal · **CL05a** Barcode Scanner · **CL05a-not-found** prompt sheet · **CL05b** Product Detail · **CL05c** Add Product

**Mobile web (Next.js) — Sprint 9 parallel (PRD `.claude/prds/web-barcode-scanner.prd.md`):**

- Same CL05a→c flow as native; **mobile viewport / touch only** — no desktop webcam scanner
- `getUserMedia` + `BarcodeDetector` with `@zxing/browser` fallback; dynamic import to avoid meal-route bundle cost
- Stitch: `barcode-scanner-modal-mobile` (phone), `barcode-scanner-modal-desktop` (tablet landscape modal)
- Reuse shared barcode normalizer + lookup with native track

**Edge Function `lookup-barcode`:**

- Input: normalized barcode string
- DB lookup → if miss, fetch Open Food Facts → map nutrients → upsert product + barcode → return
- Rate-limit per user (e.g. 30/min); cache OFF responses briefly to avoid hammering OFF
- **Cost: $0** (OFF is free; Supabase Edge invocations within Pro quota)

**UX polish (Warm Performance):**

- Viewfinder frame with concentric radius; subtle scan-line motion (respect `prefers-reduced-motion`)
- Haptic on successful decode; soft haptic on not-found (not error vibration)
- **Not-found sheet:** `AnimatePresence mode="wait"`; barcode in monospace + tabular-nums
- Macro inputs on CL05c: tabular-nums; live calorie hint if P/C/F filled
- Quantity stepper on CL05b: 44×44px targets; live macro totals update as servings change
- "Add to meal" / "Save product" press feedback `scale(0.96)`; explicit transition properties (no `transition: all`)
- Empty search footer: **"+ Add a product I use"** (same CL05c, manual path)

**Offline:** Last 50 scanned products cached in AsyncStorage. If scan misses and network unavailable: prompt *"Can't look up this barcode offline. Add it manually?"* → CL05c with barcode pre-filled from scan.

**Tests (TDD order):** barcode normalizer → macro calculator → lookup RPC → OFF mapper → not-found prompt → CL05c create user product → RLS (shared vs private) → Maestro scan-miss-add-log flow

### Client Profile
Goals, Progress (charts + photo timeline), History, Weekly Check-ins (sleep, soreness, stress, energy 1–5).

### MVP Draft Extras
- **Tasks:** CRUD, optional client link, scheduled date, type, TODO default
- **Notes:** Manual or post-training, client-related or not

### Progress Photos (MVP)

**Why photos, not video:** Still photos give coaches the visual signal they need for body-composition progress without upload, transcode, or storage costs. **Form feedback happens live on Phase 2 video calls**, not via stored clips.

**Client flow (Log Body Metrics):**
- Capture or pick **front, side, back** (all three required before save)
- On-device compress to WebP/JPEG (target ≤2MB each)
- Optional pose guide overlay (silhouette) for consistent framing week-to-week
- Stored in `progress-photos/{client_id}/{log_id}/{pose}.webp`

**Coach flow (Client Detail → Analytics):**
- Week-over-week gallery with date labels and tabular-nums on measurements
- Side-by-side compare: select any two check-ins
- History tab shows photo log rows with thumbnail strip
- Coach can reply via messaging; no separate review queue in MVP

**Notifications:** Push/in-app when a linked client saves new progress photos.

### Training Log — Sport Types & Field Matrix (MVP + in-call)

**Confirmed:** Log **every set live** during video calls. Same Zod schema and DB columns for offline log, coach log-on-behalf, and in-call log.

**Sport types** (enum on `workouts.sport_type`):

| Type | UI fields (per set or interval row) |
|------|-------------------------------------|
| `weight_lifting` | `reps`, `weight_kg`, `rpe`, `rest_sec`, `notes` |
| `general_fitness` | `reps` and/or `duration_sec` and/or `weight_kg` (added load) and/or `distance_m` — show inputs based on exercise template or coach toggle |
| `running` | `distance_m`, `duration_sec`, `elevation_m` (optional), `notes`; interval mode: `work_sec`, `rest_sec`, `rounds` |
| `cycling` | `distance_m`, `duration_sec`, `power_w` (optional), `cadence_rpm` (optional), `notes`; interval mode |
| `swimming` | `distance_m`, `duration_sec`, `laps`, `stroke` (optional), `notes`; interval mode |

**`workout_sets` columns (nullable — only relevant fields populated):**

```text
reps · weight_kg · duration_sec · distance_m · elevation_m
power_w · cadence_rpm · laps · stroke · rpe · rest_sec · notes
interval_work_sec · interval_rest_sec · interval_rounds
```

**In-call UX (V03):**
- After each set: coach taps **Save set** (or auto-save on row blur) → Realtime event → client strip updates  
- **+ Set** pre-fills previous row values (weight/reps) for fast logging  
- **Duplicate set** for drop sets  
- Tabular-nums on all numeric fields; 44px row targets  
- Session `duration_sec` from call timer on save  

**Validation:** Postgres CHECK constraints per sport type (e.g. weight_lifting requires reps; running requires distance or duration).

### Community Catalog & Saved Templates (MVP)

**Product pattern:** One **typeahead + pick** UX reused for **foods and exercises** in MVP. **Training locations (`places`)** reuse the same pattern in **Phase 3+** when Find Coach + gym/facility surfaces ship — not required for solo-coach roster MVP.

#### Training locations (`places` + `coach_places`) — Phase 3+ only

**Tables:**

| Table | Purpose |
|-------|---------|
| `places` | Canonical venue: `name`, address fields, `place_type` (`gym` \| `studio` \| `park` \| `outdoor` \| `online` \| `other`), optional lat/lng, `normalized_key` (unique dedupe hash), `usage_count`, `source` (`seed` \| `user`) |
| `coach_places` | Junction: `coach_id`, `place_id`, `is_primary`, optional `custom_label`, `sort_order` |

**Lookup (O05 onboarding, CH13 profile):**

```
Type name or street → RPC search_places(q, city?, limit)
  ├─ Rank: text similarity + usage_count + same city boost
  ├─ Row UI: name · one-line address · "Used by N coaches" (tabular-nums)
  └─ No match → "Add '{q}'" → insert place + coach_places link
```

**UX (O05 / CH13):**

- Combobox with grouped results; **Online / Remote** chip skips address fields
- Primary toggle on linked rows; map pin preview when lat/lng present (optional geocode Edge Function — Phase 2)
- Never force full address re-entry when a canonical `place` exists

**RLS:** `places` readable by all authenticated users; insert allowed for coaches (new venue); update `usage_count` via trigger on `coach_places` insert.

#### Food catalog extensions (`food_products` + saved meals)

**Existing:** `food_products`, `food_product_barcodes`, `meals`, `meal_items` (see Barcode Meal Logging).

**Additions:**

| Table | Purpose |
|-------|---------|
| `saved_meals` | Named combo: `owner_id`, `name`, optional `meal_type`, `last_used_at` |
| `saved_meal_items` | `saved_meal_id`, `product_id`, `quantity_servings` |

**Ranking for CL05 search:**

1. User’s recents (last 20 `meal_items` distinct `product_id`)
2. User’s custom products (`source = user`, `created_by = auth.uid()`)
3. Global catalog (ILIKE + usage_count)

**UX:**

- **Log again** from meal history or saved meal → pre-fill `meal_items`
- **Save as meal** after logging → name dialog → `saved_meals` + items
- **Barcode miss:** prompt *"Add this product?"* before form — barcode locked on CL05c; shared catalog on save
- **Manual add:** *"+ Add a product I use"* from search → CL05c without barcode; private to user
- Ranking unchanged: recents → user's private products → global catalog

#### Exercise catalog & workout templates

**Tables:**

| Table | Purpose |
|-------|---------|
| `exercises` | Canonical name: `name`, `sport_type`, `default_field_mask` (which set columns apply), `aliases[]`, `usage_count`, `source`, optional `created_by` |
| `workout_templates` | Saved workout: `owner_id`, `owner_role` (`coach` \| `client`), `name`, `sport_type`, `notes`, `is_favorite`, `last_used_at` |
| `workout_template_items` | `template_id`, `exercise_id` nullable, `exercise_name` (denormalized if custom), `sort_order`, optional `default_sets` jsonb |

**Lookup (CH07, CL06, V03 in-call):**

```
Type exercise or template name → search_exercises_and_templates(q, sport_type?, role)
  ├─ Recents (owner’s last logged exercise names)
  ├─ My templates (workout_templates where owner_id = auth.uid())
  ├─ Global exercises (sport_type filter)
  └─ Coach-assigned templates (client + active relationship) — Phase 2
```

**Coach flows (CH23 Workout Library — MVP):**

- **Save session as template** from completed log or mid-edit
- **Start from template** on Log Training → hydrates exercises; coach/client fills today’s sets
- **Custom exercise:** if name not in catalog → insert `exercises` with `created_by`; visible to creator immediately; usage_count promotes discoverability

**Client flows (CL21 My Workouts — MVP):**

- Same template CRUD for solo logging; cannot publish to global catalog
- Templates do not auto-assign — coach assignment is Phase 2 (`coach_assigned_templates`)

**In-call (Phase 2):** V03 opens with optional template picker; per-set live logging unchanged.

**UX polish:**

- Combobox rows 44px min height; section headers: Recents · My workouts · Exercises
- `font-variant-numeric: tabular-nums` on usage_count badges
- Debounced search 150ms; cache last query results in TanStack Query
- Offline: recents + saved templates from AsyncStorage; search shows cached only

**Tests:** place dedupe normalizer · search_places ranking · template hydrate → workout draft · RLS on user-owned exercises/products

### Live Video + In-Call Training Log (Phase 2)

**Policy:** Live peer-to-peer calls only. **No async client video uploads** (product decision confirmed). No Supabase Storage for call media. No `form_feedback` queue. No AI pose detection.

**Coach UX (`V02` Active Call):**
- Primary: remote video (full) + local PiP
- Controls: mute, flip camera, end call, connection quality
- **Log workout** opens V03 panel — coach selects sport type, adds exercises, **logs each set live**
- **+ Set** / duplicate last set for speed; optional RPE and rest between sets
- **Save on end:** modal shows full session (already captured set-by-set) → persist with `video_call_id`

**Client UX (`V02`):**
- Same call controls minus logging
- Read-only strip updates **after every set**: “Set 2 · Back Squat · 8 @ 80 kg” (Realtime)

**Data model additions:**
- `video_calls`: id, coach_id, client_id, booking_id nullable, status, started_at, ended_at, duration_sec
- `workouts.video_call_id` nullable FK — links session log to the call
- `workouts.source` enum: `client_self` | `coach_offline` | `live_session`

**Realtime:** `call:{id}:workout_draft` — event per set (`set_added`, `set_updated`, `exercise_added`); ephemeral until call-end persist

**Tests:** Maestro mock call + log 3 sets live; unit tests for field matrix validation per sport type; RLS on draft channel

### Group Online Training (Phase 3 — specification)

**Confirmed cap:** up to **20 participants** per class. Requires **SFU** (not P2P mesh).

| Aspect | Direction |
|--------|-----------|
| Scheduling | Coach creates `group_sessions` on calendar; clients enroll until `max_participants` (default 20) |
| Video | **SFU required** — evaluate LiveKit Cloud vs Cloudflare Calls; budget egress separately from 1:1 TURN |
| Coach tools | Scrollable participant grid (4×5), spotlight one feed, mute-all, optional chat, class-wide assignment broadcast |
| Logging | Per-demo-client in-call log (same V03 model) **or** assignment-only block without per-person sets — TBD |
| Billing | **Team Custom** add-on; per-seat or flat class fee; SFU minutes dominate cost at 20×720p |

### Coach Profile
Tabs: Plans, Certificates, Experience, Education, Notifications, Settings, **Company (CH24)** — edit source org metadata. **Locations — Phase 3+** (gyms/facilities).

### Personal Company (MVP — invisible scaffold)

**Trigger:** Edge Function or DB trigger on coach onboarding completion.

1. Insert `organizations` row: `kind = personal`, default name from coach display name, `owner_user_id = coach`, limits from `personal_subscription_tier` (Free: 3 clients).
2. Set `coach_profiles.source_organization_id` and `current_organization_id` to new org id.
3. Insert `organization_members` (role `owner`, status `active`).

**CH16 Company settings:** Edit source company metadata. Team admins edit studio org via TM08 when applicable.

**No Team UI in MVP** — personal company is invisible scaffolding except Settings → Company.

### Team Plan & Organizations (Phase 3 — specification)

**Product thesis:** *Every coach is a company.* **Launch** creates the personal company; **Phase 3** adds multi-coach **team** orgs on top.

#### Source vs current company

```text
onboarding_complete:
  org = create organizations(kind=personal)
  coach.source_organization_id = org.id
  coach.current_organization_id = org.id
  coach.personal_subscription_tier = 'free'

invite_accept(team_org):
  organization_members.insert(team_org, coach, role=coach, active)
  coach.current_organization_id = team_org.id   -- default workspace = studio
  coach.preferred_workspace_id = team_org.id    -- optional: remember last choice
  -- personal_subscription_tier UNCHANGED
  -- effective_features = team org entitlements (while current = team)

switch_workspace(target_org_id):
  assert target_org_id in allowedWorkspaces(coach)
  -- allowed = source_organization_id OR any org with active membership
  coach.current_organization_id = target_org_id
  coach.preferred_workspace_id = target_org_id
  -- re-fetch entitlements; invalidate client/calendar caches client-side

member_removed | member_left:
  organization_members.status = 'removed'
  coach.current_organization_id = coach.source_organization_id
  -- if current was that team, reset; if on personal, unchanged
  -- effective_features = coach.personal_subscription_tier (free|pro)
```

#### Entitlement resolver (server-side)

```typescript
function effectiveEntitlements(coach: CoachProfile) {
  const { source_organization_id, current_organization_id, personal_subscription_tier } = coach

  if (current_organization_id !== source_organization_id) {
    const membership = activeMembership(current_organization_id, coach.user_id)
    const org = getOrganization(current_organization_id)
    if (membership && org.kind === 'team' && orgHasActiveTeamPlan(org)) {
      return teamEntitlements(org, membership)
    }
  }

  return personalEntitlements(personal_subscription_tier, source_organization_id)
}
```

**Subscription gate (team features):** `organizations.kind = team` AND `plan_tier ∈ (team, team_custom)` AND `billing_status ∈ (active, partner_comp, trial)` AND user has active membership.

**Personal Pro gate:** `personal_subscription_tier = pro` OR `partner_comp` on source personal org.

#### Workspace switching (Phase 3)

Coaches with **≥2 allowed workspaces** (source personal + one or more active team memberships) can change `current_organization_id` without leaving the studio.

```typescript
function allowedWorkspaces(coach: CoachProfile): OrganizationId[] {
  const ids = [coach.source_organization_id]
  for (const m of activeMemberships(coach.user_id)) {
    if (m.org.kind === 'team') ids.push(m.organization_id)
  }
  return unique(ids)
}

// POST /api/coach/workspace { organizationId }
// Validates membership; updates current + preferred; returns effectiveEntitlements + org summary
```

**UI:** Top-bar workspace chip → bottom sheet **WS01**. All list/detail queries filter by `current_organization_id`. Team nav (TM*) mounts only when `current !== source` and role permits.

**CH24:** Always edits **source** org metadata; banner shows active workspace name + "Switch workspace" link.

#### Default limits (overridable in DB)

| Column | Default | Enforced when |
|--------|---------|-------------|
| `max_coaches` | **5** | Inviting/activating coach role |
| `max_clients_per_coach` | **12** | New pairing or book-for-coach |
| `max_staff` | **3** | Inviting staff role (non-coach) |

**Expansion:** In-app **Contact to expand** → sales/ops updates org row (and optional `organization_member_limits`) — no app release.

#### Schema (additions)

```sql
-- organizations (personal + team)
id, name, slug, kind text check (kind in ('personal','team')),
owner_user_id,
plan_tier text check (plan_tier in ('free','pro','team','team_custom')),
  -- personal orgs: free|pro mirror coach personal_subscription_tier
  -- team orgs: team|team_custom
max_coaches int default 5,          -- team orgs only; null on personal
max_clients_per_coach int default 12,
max_staff int default 3,
max_clients int default 3,           -- personal free cap; null/unlimited for pro personal
billing_status text check (billing_status in (
  'active','past_due','canceled','trial','partner_comp'
)),
stripe_subscription_id text,
partner_comp_reason text,
partner_comp_until timestamptz,
created_at, updated_at

-- coach_profiles (extend)
source_organization_id uuid not null references organizations(id),
current_organization_id uuid not null references organizations(id),
preferred_workspace_id uuid references organizations(id),
personal_subscription_tier text not null default 'free'
  check (personal_subscription_tier in ('free','pro')),
  check (personal_subscription_tier in ('free','pro')),

-- organization_members
id, organization_id, user_id,
role text check (role in ('owner','admin','coach','staff')),
status text check (status in ('invited','active','removed')),
invited_email text, invited_at, joined_at, removed_at,
removed_reason text  -- 'left' | 'fired' | 'org_canceled'

-- organization_member_limits (team orgs)
organization_id, user_id, max_clients int, notes text

-- coach_client_relationships (extend)
organization_id uuid not null references organizations(id),
  -- always the org context when pairing was created (current company at invite time)

-- tasks (extend)
organization_id uuid not null,
assignee_user_id nullable,
created_by_user_id

-- partner_entitlements (audit)
id, organization_id, user_id nullable, granted_by, reason,
plan_tier, expires_at, created_at
```

#### Owner / admin capabilities

| Capability | Implementation notes |
|------------|---------------------|
| **Team home (TM01)** | Cards: coaches active, total clients, sessions 7d, **hours with clients** (`sum(sessions.duration_sec)` completed, tabular-nums) |
| **Staff roster (TM02)** | List members + invite CTA; badge client count / coach vs staff |
| **Invite (TM03)** | Email + role; magic link; enforce `max_coaches` / `max_staff` |
| **Coach stats (TM04)** | Reuse analytics queries scoped to `coach_id`; owner read-only |
| **Org calendar (TM05)** | Union of member `sessions`; filter chips per coach; color lane per member |
| **Book for coach (TM06)** | Owner/staff creates `booking_requests` or `sessions` with `coach_id` ≠ self |
| **Assign task (TM07)** | `tasks.assignee_user_id` + optional client link |
| **Limits (TM08)** | Progress bars “4/5 coaches”; at cap → disable invite + show contact CTA |

#### Coach-on-staff experience

- Same **CH\*** flows for roster in **current** (studio) context; RLS scoped to `organization_id = current`.
- Profile shows studio badge when `current ≠ source`.
- **Source company** dormant while employed — not deleted; visible read-only under Settings → Company (edit metadata OK, no new clients on source until `current` resets).
- On leave: **current → source**; client cap and features = `personal_subscription_tier` immediately.

#### Team owner lifecycle

- Owner’s **source** = personal company from onboarding.
- Subscribe Team → create or upgrade to `organizations(kind=team)`; owner `current_organization_id` = team org while operating studio.
- Cancel Team → offboard members, `current_organization_id` → source for owner; team org archived or downgraded.

#### Partner comp (premium without paying)

1. Ops sets `billing_status = partner_comp` on **team org** or **personal org** (Pro-only partners).
2. Optional `partner_comp_until`; audit row in `partner_entitlements`.
3. **Does not change** `personal_subscription_tier` — comp is org-level billing override.
4. Invited coaches on comped studio still revert to personal tier on leave.

#### Stripe (Phase 3)

- Product: **Team $99/mo** (price ID TBD) — includes default limits.
- **Team Custom:** manual invoice or Stripe custom price; limits set in DB after contract.
- Metered overage (future): optional per-coach seat above `max_coaches`.

#### RLS sketch

- `organizations`: SELECT if member active; UPDATE if role owner/admin.
- `organization_members`: SELECT org peers if admin/owner; coaches see self row only.
- Coach client data: owner/admin SELECT via `organization_id` on relationship; coaches SELECT own pairings only.
- `sessions` / bookings created by staff: INSERT with service role check that staff belongs to org.

#### Tests

- pgTAP: onboarding creates personal org + source = current.
- pgTAP: invite sets current to team; remove resets current to source.
- pgTAP: after remove, Pro coach regains unlimited client cap on source org.
- pgTAP: after remove, Free coach blocked at 4th client on source.
- pgTAP: invite blocked at 6th coach when `max_coaches = 5`.
- Maestro: accept invite → see studio home → leave → solo home restored.

---

## 9. Design System

**Name:** Warm Performance (extends Stitch "High-Performance Athleticism")

| Token | Value |
|-------|-------|
| `--surface-warm` | `#FAFAF8` |
| `--surface-paper` | `#F7F5F0` |
| `--text-primary` | `#1A1C1E` |
| `--text-secondary` | `#6B7280` |
| `--accent-coach` | `#C5F347` |
| `--accent-client` | `#E8A849` |
| `--border-subtle` | `#E9ECEF` |
| `--error` | `#BA1A1A` |
| `--success` | `#10B981` |

**Typography:** Hanken Grotesk — display-lg, headline-md, body-md, label-caps, stat-value (tabular-nums)

**Spacing:** 4px base · 8/16/32px stacks · 20px screen margin

**Radius:** 8px inputs · 12px cards · 16px sheets · concentric radius on nested surfaces

**Motion tokens:** See `packages/shared/motionTokens.ts` — fast 180ms, normal 350ms, press scale 0.96

---

## 10. Delivery model (sprint-first)

> **Source of truth:** `docs/SPRINT_ROADMAP.md` — goals, work items, migrations, tests, and retrospective per sprint.  
> **This section** is the index only. Edit sprint scope in the roadmap first, then sync the table below.

**Cadence:** ~2 weeks per sprint · **Track:** web-first (`frontend/`) · **Progress bar:** 60-screen MVP inventory (`node scripts/compute-web-mvp-progress.mjs`)

### Phase → sprint map

| Phase | Sprints | Investor demo anchor |
|-------|---------|----------------------|
| **0 Foundation** | 1–4 | Week 4 — auth + shells |
| **1 Tracking** | 5–12 | Week 8 — client logs → coach sees data |
| **2 Scheduling & comms** | 13–18 | Week 12–14 — booking + messaging (**discover Phase 2**) |
| **3 Beta** | 19–20 | Week 20 — full walkthrough + marketing live |
| **4 Live video** | 21–24 | Post-MVP — WebRTC + in-call log |
| **5 Team workspace** | 25+ | Phase 3 — TM01–09 |

### Master sprint index

| Sprint | Theme | Phase | Status (2026-06-16) |
|--------|-------|-------|------------------------|
| **1–2** | Bootstrap, auth, app shells | 0 | **Done** |
| **3–4** | Onboarding + personal org (core) | 0–1 | **Partial** → polish in **S11** |
| **5–6** | Logging: meal, training, body, saved meals | 1 | **Done** / partial coach action |
| **7** | Client home + coach client loop | 1 | **Done** |
| **8** | Logging hub + progress photos + marketing early drop | 1 | **Done** (meal recents carry-over) |
| **9** | Coach History + Analytics depth | 1 | **Complete** |
| **9.5** | Product Concept v3 (invites, types) | 1 | **Done** (2026-06-27) |
| **9.6** | Reservation approval + staff booking ops (courts) | 3+ | **Deferred** — facility product, not coach-first MVP |
| **10** | Coach log-on-behalf + workout library | 1 | **Done** |
| **11** | Onboarding polish + company settings | 0–1 | **Current** |
| **12** | Tasks, notes, coach profile tabs | 1 | Planned |
| **13** | Coach calendar views | 2 | Planned |
| **14** | Booking request → accept/decline + session approval email | 2 | Planned · extends Sprint 9.6 approval pattern |
| **15** | Find coach (marketplace RLS) | 2 | Post-MVP · flag `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED` (default off for launch) |
| **16** | Coach public storefront + plans | 2 | Post-MVP · polish after invite-only beta |
| **17** | Realtime messaging | 2 | Planned |
| **18** | Notification center + badges | 2 | Planned |
| **19** | Marketing polish (W01/W08), check-ins | 3 | Planned · W01 **partial** (Stitch landing shipped) |
| **20** | Beta E2E suite + design QA pass | 3 | Planned |
| **21–24** | WebRTC, TURN, in-call training log | 4 | Scaffold only |
| **25+** | Team workspace TM01–09 | 5 | Not started |

**Cross-cutting (not a sprint):** Marketplace feature flag gates discover CTAs, nav, and landing copy when `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED=0` — see `frontend/src/lib/feature-flags/coach-marketplace.ts`.

### Mobile track

Mirror web **Sprints 7 → 20**. Add **native Sprint 8b** for barcode meal flow (CL05a). **Web mobile barcode (W-CL05a)** ships on Next.js in Sprint 9 (desktop web excluded).

---

## 11. Sprint breakdown (detail)

Full per-sprint work items, DB migrations, exit criteria, and TDD ceremony: **`docs/SPRINT_ROADMAP.md`**.

### Critical path (dependency order)

```text
S1–2 Auth/shells
  → S3–4 Onboarding (core) ─────────────────────────────→ S11 polish
  → S5–8 Logging + photos ──→ S9 Analytics depth
  → S7 Client home + coach clients ──→ S9
  → S10 Coach log-on-behalf
  → S11 Org/onboarding ──→ S13–14 Calendar
  → S13–14 Booking ──→ S17–18 Messaging
  → S15–16 Discover (Phase 2 — after invite-only beta stable)
  → S9 + S12 + S18 ──→ S19–20 Beta
  → S21–24 Video (after beta)
  → S25+ Team (after personal org stable in S11)
```

**Rules:** No analytics gallery depth (S9) before body metrics + photos (S8). No team workspace (S25+) or **places/facility** work before solo-coach MVP (S20 beta). **Launch gate:** roster + logging + booking + messaging without Find Coach. Marketplace flag stays `0` until Phase 2.

---

## 13. Team & Roles

| Role | Focus |
|------|-------|
| RN Lead | Architecture, Supabase, core features |
| Mobile Dev | UI, navigation, animations |
| Backend/Infra | Edge Functions, RLS, CI/CD |
| Designer (PT) | Stitch prompts, design QA, store assets |
| QA (PT) | E2E, beta triage |

---

## 14. Investor Milestones

| Week | Demo |
|------|------|
| 4 | Auth + role select + empty dashboards |
| 8 | Client logs meal/workout → coach sees snapshot |
| 12 | Booking request accepted, both calendars update |
| 14 | Coach invites client by email; client logs meal → coach sees snapshot; booking accepted |
| 18 | Analytics dashboard with adherence + progress photos |
| 20 | Full mobile walkthrough + marketing site live |

---

## 15. Risk Register

| Risk | Mitigation |
|------|------------|
| Progress photo storage | JPEG/WebP only, max 3 images × 2MB after client-side compress; Supabase bucket lifecycle rules |
| WebRTC NAT / mobile reliability | Cloudflare Realtime TURN + cellular testing; fallback UI when connection fails |
| Barcode not in OFF / wrong macros | User Add Product; serving-size edit; coach can flag bad entries (Phase 2 moderation) |
| Camera permission denied | Manual search + Add Product; link to Settings (S03 pattern) |
| iOS local builds | Requires Mac + Xcode; plan release cadence around hardware access |
| RLS data leaks | Automated RLS test suite per migration |
| Coach adoption | 10 pilot coaches, coach-first GTM |
| Scope creep | Strict MVP gate — **no gyms/facilities/marketplace/Team** until S20 exit; tasks/notes in, payments Phase 2 |

---

## 16. Testing Strategy

### CI pipeline (GitHub Actions)

Workflow: `.github/workflows/ci.yml` · triggers on `push` / `pull_request` to `main` / `master`.

| Job | Command | Depends on | Purpose |
|-----|---------|------------|---------|
| **lint** | `npm run lint` | — | ESLint (`frontend`, `--max-warnings 0`) |
| **build** | `npm run build` | — | `next build` + TypeScript (placeholder Supabase env in CI) |
| **test** | `test:shared` + `test:coverage` (+ PR `test:coverage:touched`) | lint, build | Vitest with MVP 80% thresholds; PR per-file gate |
| **e2e** | `npm run test:e2e -w frontend` | lint, build, test | Playwright smoke + coach flows; local Supabase via `bd-scripts/seed/ci-e2e-setup.sh` |

**Local parity** (from repo root):

```bash
npm run lint          # ESLint
npm run build         # Next.js production build
npm test              # shared + frontend unit tests
npm run e2e:setup     # Supabase local + migrations + E2E seed (requires Docker)
npm run test:e2e      # Playwright (frontend workspace)
npm run test:bd       # pgTAP RLS tests (requires local Supabase)
```

**Local E2E without Docker:** see [`docs/E2E_SETUP.md`](E2E_SETUP.md) (`npm run e2e:setup:remote`).

**CI status (2026-06-14):** `lint` · `build` · `test` green after fixing coach-client history mappers, company-settings form sync, analytics photo query typing, and shared schema import paths. `e2e` runs in CI with Chromium + seeded coach/client users (`E2E_COACH_*`, `E2E_CLIENT_*`); Playwright report uploaded on failure. Local `e2e:setup` fails fast with Docker guidance when Docker Desktop is not running (Windows pipe error).

### Test layers

| Layer | Tool | Target | Where |
|-------|------|--------|-------|
| Unit | Vitest | **Touched slice** ≥80% per changed file; **MVP aggregate** ≥80% on `test:coverage` | `frontend/packages/shared`, `frontend/src/**/*.test.ts` |
| Component | Vitest + React Testing Library | Interactive views, labels, a11y helpers | `frontend/src/features/**` |
| Integration | Supabase local + pgTAP | 100% RLS on critical tables | `bd-scripts/tests/` · `npm run test:bd` |
| Integration | Supabase + RPC / Storage | Meal insert, progress photos, roster reads | Feature `queries.ts` + pgTAP |
| E2E | Playwright (web MVP) | Auth, coach home/clients/detail, client home, client log flows, coach onboarding complete | `frontend/tests/e2e/` |
| E2E | Maestro (mobile, later) | Barcode meal log, booking, messaging | Not in CI until Expo track |

### Playwright smoke coverage (web)

| Spec | Flow |
|------|------|
| `auth-guest.spec.ts` | Login/signup pages render |
| `auth-signed-in.spec.ts` | Role redirect after seed login |
| `coach-home.spec.ts` | Coach dashboard loads |
| `coach-clients-detail.spec.ts` | Clients list → client detail |
| `client-home.spec.ts` | Client home widgets |
| `client-log-body.spec.ts` | Log hub → body metrics → weight + photos → save |
| `client-log-meal.spec.ts` | Log hub → meal search → add product → save meal |
| `client-saved-meals.spec.ts` | Saved meals list → log again |
| `coach-onboarding-complete.spec.ts` | Coach onboarding complete → coach home |
| `clients-list-preview-detail.spec.ts` | Two-pane roster + preview |

### Coverage policy

> **Canonical reference:** [`docs/COVERAGE_POLICY.md`](COVERAGE_POLICY.md) — three scopes (MVP aggregate, touched slice, global).

| Scope | What it measures | 80% gate? | Command |
|-------|----------------|-----------|---------|
| **MVP slice aggregate** | `features/`, `components/`, `lib/` per `vitest.config.ts` exclusions | Yes (Vitest thresholds) | `npm run test:coverage` |
| **Touched slice** | Production files changed vs `BASE_REF` (default `origin/main`) | Yes (pre-merge / sprint) | `npm run test:coverage:touched` |
| **Global** | All `frontend/src/**` incl. routes & marketing | No (informational ~64% statements, 2026-06-14) | `npm run test:coverage:global` |

- **Do not** cite global % when a sprint claims “80% coverage” — say **touched slice** or **MVP aggregate**.
- CI `test` job enforces MVP aggregate (`test:coverage`) and, on pull requests, touched-slice (`test:coverage:touched --skip-run`). Local `npm test` skips coverage for speed.
- Shared package: every changed export under `packages/shared/src/` needs a `*.test.ts` (`npm run test -w @coachr/shared`).
- Critical paths: Playwright E2E + pgTAP RLS (`npm run test:bd`) remain required alongside unit coverage.

---

## 17. Security

- Supabase Auth with email verification, PKCE
- RLS on every table; signed storage URLs
- Zod validation client + Postgres CHECK constraints
- GDPR: data export + account deletion Edge Function

---

## 18. Post-MVP Roadmap

- **Q3 2026:** Stripe Pro ($29/mo), WebRTC 1:1 live sessions + in-call training log, **Find Coach + storefront**
- **Q4 2026:** **`places` / gym location catalog**, marketplace location filters
- **Q1 2027:** Team plan ($99/mo), studio org workspace, partner comp; facility/reservation ops as separate track
- **Q2 2027:** Group online classes (SFU), wearables, coach API

---

## 19. KPIs

| Metric | 90-Day | 6-Month |
|--------|--------|---------|
| Registered coaches | 50 | 200 |
| Registered clients | 500 | 2,000 |
| Coach–client pairings | 200 | 800 |
| Weekly active coaches | 30 | 100 |
| Workouts logged/week | 1,000 | 5,000 |
| Booking conversion | 40% | 55% |
| Coach Pro conversion | 15% | 25% |
| Team orgs (paying or partner comp) | — (Phase 3) | 15 |
| NPS | 40+ | 50+ |

---

## 20. Running Costs

> **Updated:** June 2026 · USD · Mobile: Expo local builds ($0) · Web: Next.js marketing on Vercel · Backend: Supabase

### 20.1 Fixed platform fees (annual)

| Item | Cost | Notes |
|------|------|-------|
| **Domain** | **$100/yr** | Per your estimate (`.com` + privacy typical) |
| **Apple Developer Program** | **$99/yr** | Required for TestFlight + App Store |
| **Google Play Console** | **$25 once** | One-time; amortize ~$25/yr in year 1 |
| **Annual fixed (year 1)** | **~$224** | Domain + Apple + Play |

### 20.2 Monthly infrastructure by phase

| Service | Dev / internal | Private beta | 6‑month KPI scale | Phase 2 (+ live calls) |
|---------|----------------|--------------|-------------------|------------------------|
| **Supabase** | Free ($0) | Pro **~$25** | Pro **~$25–35** | Pro **~$30–45** |
| **Vercel** (Next.js marketing) | Hobby ($0)* | Pro **$20** | Pro **$20** | Pro **$20** |
| **Expo** (SDK + local builds) | **$0** | **$0** | **$0** | **$0** |
| **TURN** (Cloudflare Realtime) | — | — | — | **$0**† |
| **Email** (Resend / similar) | Free tier | **$0–20** | **$20** | **$20** |
| **Monitoring** (Sentry, optional) | Free | **$0–26** | **$26** | **$26** |
| **Monthly subtotal** | **$0** | **~$45–71** | **~$65–91** | **~$91–118** |

\*Vercel Hobby prohibits commercial use — move to Pro before paid coaches/clients.

†Cloudflare Realtime TURN: **1,000 GB/mo free**, then **$0.05/GB** egress ([pricing FAQ](https://developers.cloudflare.com/realtime/turn/faq/)). Phase 2 estimate (~200 coaches × 5 × 30 min, 20% relay @ 1 Mbps) ≈ **44 GB/mo → $0**. Overage example: **~2,300 GB/mo** relay ≈ **$65/mo**.

**Amortized annual fees in monthly terms:** domain + Apple ≈ **+$17/mo** on top of rows above.

**Supabase Pro ($25/mo) includes (June 2026 pricing):** 100K MAU, 100 GB file storage, 250 GB egress, 8 GB DB disk, Micro compute credit (~$10). Overage: MAU **$0.00325**, storage **$0.021/GB**, egress **$0.09/GB**, DB **$0.125/GB**. Team plan **$599/mo** adds SSO/SOC2 — not needed until enterprise sales. Use `tools/coachr-cost-calculator.html` for scenario modeling.

### 20.3 Recommended monthly totals (all-in)

| Phase | Who’s on the platform | **Est. monthly** | **Est. annual** |
|-------|------------------------|------------------|-----------------|
| **A — Build** (weeks 1–16) | Team only, staging | **$0–17** | **$0–200** |
| **B — Private beta** | ~50 coaches, ~500 clients | **$62–88** | **~$740–1,050** + $224 fixed |
| **C — Post‑MVP** (6‑mo KPIs) | ~200 coaches, ~2,000 clients | **$82–108** | **~$980–1,290** + $224 fixed |
| **D — Phase 2** | + WebRTC calls, Stripe, push | **~$97–135** | **~$1,160–1,620** + $224 fixed |

Stripe payment processing is **not** included — at $29/mo Pro and 50 paying coaches, expect ~**$45/mo** in Stripe fees (2.9% + $0.30), offset by revenue.

### 20.4 Supabase variable costs (progress photos)

**Pricing source:** [supabase.com/pricing](https://supabase.com/pricing) · [billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase) (June 2026).

| Quota | Free | Pro included | Pro overage |
|-------|------|--------------|-------------|
| Monthly active users | 50K | **100K** | $0.00325 / MAU |
| File storage | 1 GB | **100 GB** | $0.021 / GB |
| Egress | 5 GB | **250 GB** | $0.09 / GB |
| Database disk | 500 MB | **8 GB** | $0.125 / GB |
| Edge Function invocations | 500K | 2M | $2 / million |
| Realtime messages | 2M | 5M | $2.50 / million |

Assumptions aligned with §8 Progress Photos: **3 × ~600 KB WebP** ≈ **1.8 MB per check-in**; active clients log **twice/month**. **MAU** ≈ coaches + clients (both authenticate). **Storage overage** applies to **total stored** (uploads × retention months), not monthly upload rate alone.

| Scale | Active clients logging | Total storage (~12 mo) | Egress (gallery views) | Supabase overage |
|-------|------------------------|--------------------------|------------------------|------------------|
| Beta | 300 | ~6 GB | ~5 GB/mo | **$0** (within Pro quotas) |
| 6‑mo KPI | 600 | ~13 GB | ~10 GB/mo | **$0** |
| Aggressive (weekly logs) | 600 | ~50 GB | ~25 GB/mo | **$0** |
| 2,000 clients all active weekly | 2,000 | ~170 GB‡ | ~80 GB/mo | **~$1.50/mo storage** + possible egress |

‡Lifecycle rules (delete photos >24 mo) keep storage flat long-term.

**Compute upgrades (Pro):** Micro (~$10/mo) covered by plan credit; Small **+$5**, Medium **+$50**, Large **+$100** vs credit. Only upgrade when DB CPU or connection limits bite — unlikely before 6‑mo KPI scale.

**Why photos beat video:** 60s 1080p clip ≈ **15–40 MB** each vs **1.8 MB** per full body check-in — roughly **10–20×** storage and egress savings at the same log frequency.

### 20.5 Expo — local builds only ($0)

OmniFit policy: **Expo SDK yes, EAS cloud/paid tiers no.**

| | OmniFit uses | Cost |
|---|-------------|------|
| **Expo SDK, Expo Router, dev server** | ✅ | **$0** |
| **Local builds** (`expo prebuild`, `expo run:ios/android`, Xcode, Gradle) | ✅ | **$0** |
| **EAS Build (cloud)** | ❌ Not used | — |
| **EAS Update (OTA)** | ❌ Store releases instead | — |
| **EAS Submit** | Optional; manual upload is fine | **$0** |

Year‑1 Expo line item: **$0/mo**.

### 20.6 WebRTC / Cloudflare Realtime TURN (Phase 2 — no LiveKit)

1:1 sessions use **P2P media** — no per-minute SFU bill. Costs are **TURN egress** only when direct connection fails (~15–25% of mobile sessions).

**Primary provider: [Cloudflare Realtime TURN](https://developers.cloudflare.com/realtime/turn/)**

| Item | Cost | Notes |
|------|------|-------|
| **STUN** (`stun.cloudflare.com`) | **$0** | Unlimited |
| **TURN free tier** | **$0** | **1,000 GB/mo** egress (shared with Realtime SFU quota on same bill) |
| **TURN overage** | **$0.05/GB** | Egress from Cloudflare edge → TURN client (RFC 8656); media stays DTLS-encrypted |
| **Supabase signaling** | **$0** extra | Realtime messages for ICE/signaling — tiny vs chat |

**How billing works:** Cloudflare charges **egress from the TURN server to the client** only (ingress to TURN is free). WebRTC encrypts media with DTLS before it hits TURN — Cloudflare relays ciphertext only.

**Relay bandwidth formula (calculator):**

```text
relay GB/mo ≈ coaches × sessions/coach × (min/60) × relay% × Mbps × 0.439
```

(`0.439` = 3600 s/h ÷ 8 bits/byte ÷ 1024 MB/GB)

| Scenario | Assumptions | Relay GB/mo | Cloudflare TURN $/mo |
|----------|-------------|-------------|----------------------|
| Phase 2 launch | 200 coaches, 5×30 min, 20% relay, 1 Mbps | **~44** | **$0** |
| Growth | 500 coaches, 8×30 min, 22% relay, 1 Mbps | **~193** | **$0** |
| Heavy video | 1,000 coaches, 10×45 min, 25% relay, 1.2 Mbps | **~988** | **$0** |
| Overage kicks in | Same as heavy + higher relay/bitrate → ~2,300 GB | **~2,300** | **~$65** |

Example from earlier planning: 100 coaches × 5 × 30 min ≈ **150 hours** video — TURN relay ~20% @ 1 Mbps ≈ **~13 GB/mo** → **$0** on Cloudflare.

**Alternatives (if you leave Cloudflare):**

| Option | Monthly | Notes |
|--------|---------|-------|
| **coturn on Hetzner/DO VPS** | **~$5–10** | Fixed cost; you operate the server |
| **Twilio Network Traversal** | **~$0.40/GB** | Pay-as-you-go; no free tier at scale |
| **Metered.ca** | **$0** (500 MB) → **$99** (150 GB) | Tight free tier |

**Implementation:** Supabase Edge Function calls Cloudflare credential API → returns short-lived `iceServers` to `react-native-webrtc`. Requires a Cloudflare account (free plan includes the 1 TB Realtime quota).

Session **recording** is not included and not planned — live-only policy.

### 20.7 Cost optimization checklist

- Keep **progress photos** as MVP visual channel — **no video storage bucket**.
- Enable Supabase **Smart CDN** + client-side WebP compress before upload.
- Set storage **lifecycle** (archive/delete old progress photos after 24 months).
- **Local Expo builds only** — no EAS subscription; budget a Mac for iOS releases.
- Single **Vercel Pro seat** until a second deployer needs dashboard access.
- **P2P WebRTC** for 1:1 calls — no LiveKit/SFU monthly fee; **Cloudflare TURN** stays **$0** until ~1 TB/mo relay.
- Enable Supabase **spend caps** on Pro to prevent surprise overages.

### 20.8 What is not in these numbers

- Engineer salaries (plan assumes 2–3 FTE in §13)
- App Store / Play **commission** (15–30% on IAP if used later)
- Legal, accounting, insurance
- Custom domain email (Google Workspace ~$6/user/mo) if needed
- **Group session SFU** (Phase 3, up to 20 participants) — budget separately; SFU egress >> 1:1 P2P TURN

---

*Companion docs: `docs/investor-product-overview.html` · `docs/design/google-stitch-prompts-website.md` · `docs/design/google-stitch-prompts-mobile.md` · `docs/SCREEN_INVENTORY.md`*
