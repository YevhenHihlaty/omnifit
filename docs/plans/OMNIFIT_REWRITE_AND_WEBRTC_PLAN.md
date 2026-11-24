# OmniFit Rewrite + Missing Features + WebRTC Plan

**Date:** 2026-09-21 · **Status:** Proposed · **Complexity:** Large (9 weeks, W0–W8)

**Authorities (do not invent scope beyond these):**

> **Commercial lock (2026-09-21):** Connect **“Stripe handles pricing”**; Free **3** / Pro **$29**; service fee Free **$1.50** / Pro **$0.50**; acquisition **$15** invoice (hypothesis); failed acquisition → **block**; no Cal.com Platform API. Source of truth: `PRODUCT_DESCRIPTION.md` §4 + `SPRINT_ROADMAP.md` Profitability locks.

| Document | Authority over |
|---|---|
| `docs/OmniFit — Design Documentation.md` | Visual system, screen behaviour, component kit |
| `docs/OmniFit-Design-Screens/*.dc.html` (121 files) | Per-screen reference renders (Pine/Cream) |
| `docs/PRODUCT_DESCRIPTION.md` | Product scope, roles, monetization (tier-dependent service fee, **$15** acquisition invoice), phase gates, profitability locks |
| `docs/DEVELOPMENT_PLAN.md` | Stack, DB schema, sprint history, cost model |
| `.claude/plan/omnifit-copy-vs-greenfield.md` | Copy vs build split (~60–70% copy) |
| `.claude/plan/omnifit-web-restyle-from-upload.md` | Restyle phasing, upload audit |
| `bd-scripts/migrations/` | Schema truth (006, 007, 091, 093, 094 are relevant and already applied) |

---

## Executive decision

### 1. Restyle + gap-fill. Not a greenfield rewrite.

`apps/web/src` already contains a working coach↔client practice app (~62 routes, 36 feature slices, ~209 colocated tests) whose domain logic — roster, invites, logging, calendar, messaging, tasks, notes, onboarding — is the same shape OmniFit needs. The delta is **skin, product gates, and six missing capabilities**, not business logic.

| Strategy | Share of remaining MVP effort | What it covers |
|---|---|---|
| **Restyle in place** | ~40% | Pine/Cream tokens, component kit, screen-by-screen pass against `Web-*.dc.html` |
| **Copy + surgery** | ~20% | Flags, copy rewrites, route guards, tier renames |
| **Build new** | ~40% | Payments Connect + $1 + receipt, notifications, weekly check-in, assign habits, legal pages, WebRTC upgrade |

**Rejected:** greenfield rewrite. It discards ~209 passing tests and a migrated, RLS-hardened schema (001–096) to buy visual consistency we can get from a token layer. The lazy-senior-dev rung that holds here is *"does it already exist in this codebase?"* — it does.

**What is already done (Phases 0–2 of `omnifit-web-restyle-from-upload.md`):**

| Phase | Item | State |
|---|---|---|
| 0 | `@coachr/shared` resolvable; `apps/web` builds | **Done** — build green; imports still use the `@coachr/shared` specifier via alias (cosmetic rename deferred) |
| 1 | `@omnifit/shared/tokens.css` imported in `app/layout.tsx`; Space Grotesk + Inter wired | **Done** |
| 1 | `styles/design-tokens.css` remapped: lime → Pine `#3F6B4F`, cream `#FBF7EF`, plum `#7C6A9C` | **Done** (semantic alias layer) |
| 1 | Shell / components / charts / pastels migrated to the new semantics | **Not done** — W1–W3 below |
| 2 | `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED` defaults off | **Done** (`lib/feature-flags/coach-marketplace.ts`) |
| 2 | `NEXT_PUBLIC_VIDEO_CALLS_ENABLED` defaults off | **Done** (`lib/feature-flags/video-calls.ts`) |
| 2 | Invite-only client path / role select | **Done** (verify in W0 gate test) |

### 2. Live video: Cloudflare Realtime **SFU** + TURN — a deliberate upgrade over `DEVELOPMENT_PLAN.md` §5.

`DEVELOPMENT_PLAN.md` specifies **P2P `RTCPeerConnection` + Supabase signaling + Cloudflare TURN**, justified as "1:1 coaching does not need an SFU." That reasoning is **cost-correct and quality-wrong**. The stated requirement here is *call quality*, so the recommendation changes.

| Dimension | P2P + TURN (current plan) | **Cloudflare Realtime SFU + TURN (recommended)** |
|---|---|---|
| Media path | Direct when NAT allows; relayed over best-effort internet on ~20–25% of mobile sessions | Always one hop to the nearest Cloudflare anycast edge, then Cloudflare backbone |
| Connect success | ~97–99% with TURN; hard failures on symmetric NAT / restrictive corporate networks | Single well-known endpoint, UDP with TCP/TLS:443 fallback → effectively deterministic |
| Bitrate adaptation | Browser BWE only; the **worse of the two uplinks dictates both directions** | Server-side BWE with simulcast/SVC layer selection **per subscriber** |
| Tail latency | Best case lowest (direct); relay case is an unpredictable public path | Consistently low; marginally above ideal direct, far better than a bad relay |
| Observability | `getStats()` only | `getStats()` **plus** Cloudflare session/track state for support triage |
| Phase 3 group (≤20) | Requires brand-new infra and a second integration | Same API, same billing line |
| Recording | N/A | **Must stay off** — no recording/egress feature is enabled (policy unchanged) |

**Cost is the real trade-off.** With P2P only ~20% of media egresses Cloudflare; with an SFU, 100% does, counted per subscriber. Using the existing formula from `DEVELOPMENT_PLAN.md` §20.6 (`GB ≈ hours × streams × Mbps × 0.439`), shared 1,000 GB/mo free tier, $0.05/GB after:

| Scenario | Session hours/mo | P2P + TURN | **SFU** | SFU cost |
|---|---|---|---|---|
| Phase 2 launch (200 coaches × 5 × 30 min, 1 Mbps) | 500 | ~44 GB → **$0** | ~440 GB | **$0** |
| Growth (500 × 8 × 30 min, 1 Mbps) | 2,000 | ~193 GB → **$0** | ~1,756 GB | **~$38/mo** |
| Heavy (1,000 × 10 × 45 min, 1.2 Mbps) | 7,500 | ~988 GB → **$0** | ~7,900 GB | **~$345/mo** |

**Decision:** adopt the SFU. It is free through Phase 2 launch, ~$38/mo at the 6-month KPI scale in `DEVELOPMENT_PLAN.md` §19, and it removes the single worst live-coaching failure mode (a call that connects badly and cannot be diagnosed). Cost is bounded by a **720p / 1.2 Mbps send cap** enforced client-side, and by keeping the P2P path alive behind a transport flag.

**Consequences to accept:**

1. `DEVELOPMENT_PLAN.md` §5 and §20.6 are superseded for the web track; update them in W8.
2. `webrtc_signals` (migration 006) becomes the **fallback-only** signaling table. SDP for the SFU path goes to Cloudflare's HTTP API; Supabase keeps call lifecycle and the in-call workout draft channel.
3. `CLOUDFLARE_REALTIME_APP_ID` / `APP_SECRET` are **server-only**. Today `features/video-call/ice-servers.ts` reads `NEXT_PUBLIC_TURN_USERNAME` / `NEXT_PUBLIC_TURN_CREDENTIAL` — long-lived static TURN credentials shipped to every browser. That must be replaced with server-minted short-lived credentials before video ships (see W7.1).

---

## Design system rewrite plan

### Token layer (source of truth)

`packages/shared/tokens.css` already defines the full OmniFit palette (`--of-pine`, `--of-plum`, ink 900/700/500, stone 300/150, cream, six pastels, warning, danger, radii, motion). `apps/web/src/styles/design-tokens.css` aliases the ported `--color-*` semantics onto it. **Keep the alias layer** — it is what makes a screen-by-screen migration possible instead of a 793-file find-replace.

| Step | File | Action |
|---|---|---|
| DS-1 | `packages/shared/tokens.css` | Add `--of-pastel-{1..6}` rotation helper + `--of-focus-ring` (pine tint, 3px) if absent |
| DS-2 | `apps/web/src/styles/design-tokens.css` | Map remaining unmapped `--color-*` (charts, pills, selected rows) to `--of-*`; **delete** any lime literal |
| DS-3 | `apps/web/tailwind.config.ts` | Confirm `pine`/`cream`/`plum`/pastel scales resolve to `--of-*`; add `status` colors |
| DS-4 | `apps/web/src/styles/` | Retire `coachr-btn-*` class names as files are touched (no big-bang rename) |
| DS-5 | `public/icons/` | Import the 62-icon pack from `docs/omnifit-icons/` as a `currentColor` sprite; 24×24, 1.8px stroke |

**Invariants enforced by review checklist, every screen:**

- Exactly **one** pine primary CTA per screen; everything else is outlined, plum text-link, or destructive red.
- Inputs 44px tall, 1.5px stone border, pine border + pine-tint focus ring on focus.
- Status is a **pill with a label**, never colour alone (`On track` / `At risk` / `New` / `Paid` / `Pending` / `Refunded`).
- Pastels tint surfaces only; text on a pastel stays Ink 900. Never two same-family pastels adjacent.
- Space Grotesk for headings **and all numerals**; Inter for body; body ≥14px; measure ≤70ch.
- `font-variant-numeric: tabular-nums` on every metric, price, and percentage.
- Concentric radii on nested surfaces (8 input / 12 card / 16 sheet); explicit transition properties, never `transition: all`; `prefers-reduced-motion` respected.

### Shared component kit (build once, in W1)

| Component | Design source | Consumers |
|---|---|---|
| `Button` (pine / outline / plum-link / destructive / disabled-precondition) | `Components-Web.dc.html` | everywhere |
| `Input`, `Select`, `Textarea`, `Toggle` | `Components-Web.dc.html` | forms |
| `StatusPill` | Design Doc §Colors | roster, sessions, payments |
| `ClientRosterRow` (pastel initials avatar, name+plan, last check-in, progress bar, pill, ⋯) | Design Doc §Web components | `coach-clients`, dashboard table |
| `StatTile` (pastel bg, sparkline slot, tabular-nums) | `Web-Dashboard.dc.html` | coach + client homes |
| `PaymentReceipt` (session price → platform fee → Stripe fee → net payout) | `Web-PaymentReceipt.dc.html` | checkout, payments, payouts |
| `SidebarNav` (ink-900 rail, pine-filled active, Go-Pro card, user footer) | `Web-Dashboard.dc.html` | `components/shell/Sidebar.tsx` |
| `FullPageError` (faded logo, tinted icon badge, headline, one CTA) | `Web-NetworkError`, `Web-SessionExpired` | error boundaries |
| `InlineEmptyState` (icon, headline, body, one contextual CTA) | `Web-EmptyStates.dc.html` | every list |

### Screen-by-screen order (design file → route)

Ordered by blast radius: shell first, then coach surface (the paying customer), then client, then new screens.

**Group A — shell + auth (W1)**

| Design file | Route / component | Notes |
|---|---|---|
| `Web-Dashboard.dc.html` (shell only) | `components/shell/Sidebar.tsx`, `AppHeader.tsx`, `MobileTabBar.tsx` | Ink-900 rail, pine active, bell with unread dot |
| `Web-Login.dc.html` | `(auth)/login` | Split panel: dark brand + testimonial |
| `Web-SignUp.dc.html` | `(auth)/register` | Split panel: 3 checkmarked value props; coach-only open signup |
| `Web-ResetPassword.dc.html` | `(auth)/reset-password` | |
| `Web-ResetPasswordSuccess.dc.html` | `(auth)/reset-password/success` | |
| `Web-VerifyEmail.dc.html` | `(auth)/verify-email` | |
| `Web-SessionExpired.dc.html`, `Web-NetworkError.dc.html` | `FullPageError` + error boundaries | |
| `Web-EmptyStates.dc.html` | `InlineEmptyState` | |

**Group B — coach surface (W2)**

| Design file | Route | Notes |
|---|---|---|
| `Web-Dashboard.dc.html` | `(app)/coach/home`, `(app)/coach` | 3 pastel stat tiles, check-in area chart, client-status donut, clients table, right rail (month calendar / today / messages) |
| `Web-MyClients.dc.html` | `(app)/coach/clients` | Two-pane 400px list + preview |
| `Web-PendingInvites.dc.html` | `(app)/coach/clients` (invites panel) | `client-invite` slice |
| `Web-ClientDetail.dc.html` | `(app)/coach/clients/[clientId]` | 5 tabs: Overview / History / Analytics / Messages / Notes |
| `Web-ClientAnalytics.dc.html` | ↑ Analytics tab | Adherence ring, weight trend, volume bars (butter = missed week), 3-photo grid, 4 measurement tiles |
| `Web-ClientHistory.dc.html` | ↑ History tab | Day-grouped, filter pills, date range |
| `Web-LogTraining.dc.html` | `(app)/coach/action` | 340px client pane + sport chips + editable exercise table |
| `Web-WorkoutLibrary.dc.html` | `(app)/coach/library/workouts` | |
| `Web-Tasks.dc.html` / `Web-Notes.dc.html` | `(app)/coach/tasks`, `(app)/coach/notes` | |
| `Web-Messages.dc.html` | `(app)/coach/messages`, `.../[conversationId]` | |
| `Web-ScheduleSession.dc.html` | `(app)/coach/calendar` (new session) | |
| `Web-CoachProfile.dc.html` | `(app)/coach/profile` + tabs | Plans / Locations / Credentials / Settings |
| `Web-CompanySettings.dc.html` | `(app)/coach/profile/settings` | Source-org metadata only |
| `Web-SubscriptionBilling.dc.html` | `(app)/coach/billing` | Tier naming — see open decision O-9 |

**Group C — client surface + shared states (W3)**

| Design file | Route | Notes |
|---|---|---|
| `Web-ClientHome.dc.html` | `(app)/client/home`, `(app)/client` | Dark calorie hero, 3 pastel quick actions, weight trend, habits checklist with "X of N done" badge |
| `Web-LogHub.dc.html` | `(app)/client/log` | 4 pastel action cards + today's log |
| `Web-LogMeal.dc.html` | `(app)/client/log/meal` | Meal-type tabs, search, frequently logged, running total footer |
| `Web-AddProduct.dc.html` | `(app)/client/log/meal` (modal) | Manual path; barcode path is mobile-web only |
| `Web-SavedMeals.dc.html` | `(app)/client/log/meal/saved` | |
| `Web-LogBodyMetrics.dc.html` | `(app)/client/log/body` | Front/side/back all required |
| `Web-ClientTraining.dc.html` | `(app)/client/log/training`, `.../templates` | "Up next" hero, template row, this-week card |
| `Web-ClientCalendar.dc.html` | `(app)/client/calendar` | Month grid + right agenda |
| `Web-ScheduleSession.dc.html` | `(app)/client/calendar` (request flow) | Day chips, slot grid, type picker, summary card |
| `Web-ClientProfile.dc.html` | `(app)/client/profile` | Goals / Progress / History / Check-in tabs |
| `Web-InviteAccept.dc.html` | `invite/client/[token]` | |

**Group D — marketing (W6)**

| Design file | Route | Notes |
|---|---|---|
| `Web-Landing.dc.html` | `(marketing)/` | Hero + dashboard mock, stats strip, 3 feature cards, testimonial, dark CTA band |
| `Web-Pricing.dc.html` | `(marketing)/pricing` | Monthly/annual toggle, 3 plans, FAQ — reconcile tiers first (O-9) |
| `Web-Contact.dc.html` | `(marketing)/contact` | **New route** |
| `Web-Privacy.dc.html` | `(marketing)/privacy` | **New route** |
| `Web-Terms.dc.html` | `(marketing)/terms` | **New route** |
| `Web-Docs.dc.html` | `(marketing)/docs` | **New route, P2** — help center |

**Group E — gated off, do not restyle**

| Design file | Route | Gate |
|---|---|---|
| `Web-FindCoach.dc.html` | `(app)/client/discover`, `.../coaches/[coachId]` | `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED=0` |
| `Web-CoachPublicProfile.dc.html` | `/c/[handle]`, `/join/[handle]` | same flag |
| `Mobile-VideoCall*`, `Mobile-VideoLobby`, `Mobile-VideoCallSummary` | `(app)/call/[callId]` | `NEXT_PUBLIC_VIDEO_CALLS_ENABLED=0` until W7 |

---

## Product gates

| Flag / gate | Default | Enforced where | Turn on when |
|---|---|---|---|
| `NEXT_PUBLIC_COACH_MARKETPLACE_ENABLED` | `0` | `lib/feature-flags/coach-marketplace.ts`; route guard on `/client/discover`, `/c/[handle]`, `/join/[handle]`; client-home CTAs; marketing nav | Phase 2, after invite-only beta is stable. Turning it on **activates `platform_sourced` pairings and the $15 acquisition invoice** — do not flip before that billing path is tested. |
| `NEXT_PUBLIC_VIDEO_CALLS_ENABLED` | `0` | `lib/feature-flags/video-calls.ts`; guard on `/call/[callId]`; hides Join buttons on session cards | W7 in staging; production only after the W8 acceptance gate |
| `NEXT_PUBLIC_VIDEO_TRANSPORT` | `sfu` | **New** — `sfu` \| `p2p`; selects Cloudflare Realtime vs the existing `BrowserVideoPeer` path | `p2p` is the break-glass fallback if Cloudflare Realtime is degraded |
| `NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED` | `0` → `1` in W6 | **New** — gates session checkout CTAs independently of coach subscription billing | Once Connect onboarding + webhook are verified against Stripe test mode |
| `NEXT_PUBLIC_STRIPE_SUBSCRIPTION_BILLING_ENABLED` | existing | `lib/feature-flags/stripe-subscription-billing.ts` | Unchanged |
| Client open registration | **blocked** | `(auth)/register` role branch + `(onboarding)/onboarding/role` | Only with the marketplace flag |

**Video flag strategy when enabling (three steps, not one switch):**

1. **Staging on, prod off.** `VIDEO_CALLS_ENABLED=1` + `VIDEO_TRANSPORT=sfu` in preview only. Run the two-participant matrix (same LAN, cross-NAT, mobile LTE, corporate proxy on TCP:443).
2. **Pro-tier allowlist in prod.** Live video is a Pro feature per `PRODUCT_DESCRIPTION.md` §4.2. Gate the entry points on `personal_subscription_tier = 'pro'` **and** the env flag, so a bad rollout touches a known set of coaches.
3. **General availability.** Flip for all Pro coaches once `video_calls` shows ≥95% of calls reaching `active` and median join time <3s over a full week.

At every step: **no recording, ever.** No Cloudflare recording/egress product is enabled, no Storage bucket for call media, no `form_feedback` queue.

---

## Missing features implementation plan

Six greenfield slices. Five of the six have their tables already migrated — the work is UI + server actions, not schema.

### M1 — In-app notifications center

| Item | Detail |
|---|---|
| Design | `Web-Notifications.dc.html`, `Mobile-Notifications.dc.html` |
| Route | **New** `(app)/notifications` |
| Slice | **New** `features/notifications/` — `queries.ts`, `actions.ts`, `labels.ts`, `NotificationsView.tsx`, `NotificationsInteractive.tsx` |
| DB | `notifications` (094) — `kind` enum (`message`, `booking_request`, `booking_decision`, `progress_photos`, `payment`, `subscription`, `system`), `title`, `body`, `href`, `read_at`, `meta` |
| Read path | RLS `notifications_select_own` — plain browser/SSR client, no special handling |
| Write path | **There is no authenticated INSERT policy.** All creation goes through `public.enqueue_notification(...)`, which is `security definer` and granted to `service_role` only. Every producer must call it from a server action using a service-role Supabase client. |
| Producers (server actions, existing slices) | `messaging` (new message → recipient), `coaching-booking` (request → coach; decision → client), `payments` (succeeded / failed → both), `subscription` (past_due → coach) |
| Producer (already live) | `progress_photos_notify_coach` trigger (094) fires when the third pose lands — nothing to build |
| Realtime | Subscribe to `notifications` inserts filtered by `user_id`; drive the header bell unread dot in `components/shell/AppHeader.tsx` |
| **Gotcha** | The 094 trigger writes `href = '/clients/{id}'`, a mobile-shaped path. Web needs `/coach/clients/{id}`. Add a `resolveNotificationHref(kind, href, meta, role)` mapper in the slice rather than a migration — see open decision O-2. |
| Risk | Low |

### M2 — Session checkout with the $1 platform service fee

| Item | Detail |
|---|---|
| Design | `Web-Checkout.dc.html`, `Mobile-Checkout.dc.html` |
| Route | **New** `(app)/client/checkout/[sessionId]` |
| Slice | **New** `features/payments/` |
| DB | `sessions.price_amount`, `sessions.stripe_checkout_session_id`, `payments` (091) |
| Charge model | **Direct charge on the connected account** — matches `PRODUCT_DESCRIPTION.md` §4.3 ("money flows to the coach's Connect account… coach bears Stripe processing fees") and matches `payments.net_payout = session_price − stripe_fee`. Create the Checkout Session with `stripeAccount: acct_…` and `payment_intent_data.application_fee_amount = 100`. Do **not** use a destination charge — it would put Stripe fees on the platform. |
| API | **New** `POST /api/stripe/checkout/session` — server-side only; validates caller is the paired client, session is unpaid, coach has a `stripe_account_id` with `charges_enabled` |
| Free sessions | `price_amount` of `0` or null → no checkout, **no service fee** (`PRODUCT_DESCRIPTION.md` §4.3) |
| $15 acquisition invoice | Wire invoice path for `platform_sourced`, unreachable in MVP while marketplace flag is off. Ship with unit tests; unpaid → **block**. Do not ship $10 auto-debit. |
| UI copy (exact, per §14) | "Session price", "Platform service fee — $1.00", "Total due today" |
| Risk | Medium — money path; every amount must be integer cents, never float |

### M3 — Stripe Connect onboarding + webhook

| Item | Detail |
|---|---|
| Design | `Mobile-CoachPayouts.dc.html`, `Web-SubscriptionBilling.dc.html` (payouts card) |
| Routes | **New** `POST /api/stripe/connect/onboard` (creates Account + AccountLink), `GET /api/stripe/connect/return`, `GET /api/stripe/connect/refresh` |
| Webhook | **New** `POST /api/webhooks/stripe` — `runtime = 'nodejs'`, raw body, `stripe.webhooks.constructEvent` signature verification |
| Events | `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated` (Connect events carry `event.account`) |
| Writes | `payments` rows via a **service-role client** — 091 defines SELECT policies only, no authenticated INSERT. This is correct; keep it. |
| Idempotency | `payments.stripe_payment_intent_id` and `.stripe_checkout_session_id` are `unique` — upsert on conflict; handle out-of-order delivery by never downgrading `succeeded` |
| Coach UI | Connect step in coach onboarding (skippable until first paid offer, per §6) + payouts card on `(app)/coach/billing` with a **disabled-precondition** button state until Connect completes |
| Secrets | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` — server-only, validated at startup; never `NEXT_PUBLIC_` |
| Risk | **High** — signature verification and idempotency are the two places this breaks |

### M4 — Payment receipt

| Item | Detail |
|---|---|
| Design | `Web-PaymentReceipt.dc.html`, `Mobile-PaymentReceipt.dc.html` |
| Route | **New** `(app)/payments/[paymentId]` (role-aware view) |
| Component | `PaymentReceipt` from the W1 kit |
| Client view | Session price · Platform service fee $1.00 · **Total charged** |
| Coach view | Session price · Stripe processing fee · **Net payout**; $1 fee shown as platform-retained, not a coach cost |
| Data | All columns exist on `payments` (091); no new queries beyond one `select … where id = $1` under existing RLS |
| Risk | Low |

### M5 — Weekly check-in

| Item | Detail |
|---|---|
| Design | `Web-WeeklyCheckin.dc.html`, `Mobile-ClientWeeklyCheckin.dc.html` |
| Route | **New** `(app)/client/check-in` (also the Check-in tab on `(app)/client/profile`) |
| Slice | **New** `features/weekly-checkin/` |
| DB | `weekly_checkins` (093) — `week_start` date, `sleep`/`soreness`/`stress`/`energy` smallint 1–5, `notes`, `unique (client_id, week_start)` → upsert, not insert |
| **Schema gap** | The design shows **five** sliders (Sleep, Soreness, Stress, Energy, **Motivation**); 093 has four. Needs migration `097_weekly_checkins_motivation.sql` adding `motivation smallint check (… between 1 and 5)`. See open decision O-1. |
| Coach side | Weekly check-ins bar chart on `Web-ClientDetail` Overview tab; missed weeks render as reduced-opacity butter bars (RLS already allows coach reads via active relationship) |
| Reminder | Due-banner on client profile Progress tab; a `system` notification is optional and **out of scope** for MVP |
| Risk | Low |

### M6 — Assign habits (coach → client)

| Item | Detail |
|---|---|
| Design | `Web-AssignHabits.dc.html`, `Mobile-AssignHabits.dc.html` |
| Route | **New** `(app)/coach/clients/[clientId]/habits` |
| Slice | Extend `features/coach-clients/` (do not create a parallel slice) |
| DB | `daily_habits`, `habit_completions` (007) — both **already read** by `client-home/queries.ts` and `coach-clients/queries.ts`; only the coach-side write path is missing |
| Scope | Create / edit / archive habit; target value + unit; client sees them in the Today's habits checklist and coach sees completion in Snapshot + Analytics |
| **Verify first** | Confirm 007 has an INSERT/UPDATE policy for the coach on an active relationship. If not, ship `098_daily_habits_coach_write.sql` with a pgTAP test. |
| Risk | Low–Medium (depends on the RLS check above) |

### M7 — Legal + contact + docs

| Item | Detail |
|---|---|
| Design | `Web-Privacy`, `Web-Terms`, `Web-Contact`, `Web-Docs` |
| Routes | **New** `(marketing)/privacy`, `/terms`, `/contact`, `/docs` (docs is P2) |
| Work | Static pages + footer link wiring (currently `#`), metadata/titles, contact form → transactional email; **validate and rate-limit the contact endpoint** |
| Risk | Low |

---

## Live video / WebRTC architecture

**Phase 2. Web first, React Native second. 1:1 only. No recording.**

### Component map

| Concern | Owner | Notes |
|---|---|---|
| Call lifecycle (`ringing → active → ended/declined/missed`) | Supabase `video_calls` (006) + Realtime postgres-changes | Unchanged from current plan; RLS already restricts to participants with an active relationship |
| Media transport | **Cloudflare Realtime SFU** | Each participant publishes one stream to the nearest edge and subscribes to the remote track |
| SDP exchange for the SFU | Cloudflare Realtime HTTP API, proxied through Next.js route handlers | `POST /apps/{appId}/sessions/new`, `/tracks/new`, `/renegotiate`, `/tracks/close` |
| NAT traversal | Cloudflare TURN (STUN free; TURN credentials minted server-side, short-lived) | Retained — the SFU connection still needs ICE |
| Fallback transport | Existing `features/video-call/browser-peer.ts` (`BrowserVideoPeer`) + `webrtc_signals` (006) | Kept behind `NEXT_PUBLIC_VIDEO_TRANSPORT=p2p`; it already handles offer/answer/ICE with pending-candidate buffering |
| In-call training log | Supabase Realtime broadcast `call:{id}:workout_draft` + persist on end | Set-by-set; ephemeral until confirm |
| Recording | **None** | No Cloudflare recording/egress, no Storage bucket, no async upload |

### Flow

```text
Coach taps "Start call" (session card or client detail)
  └─ server action: insert video_calls (RLS: coach_has_active_client) → status 'ringing'
       └─ Supabase Realtime notifies the client → incoming-call UI

Each participant, on join:
  1. POST /api/video/session   → server verifies membership of video_calls row
                               → server calls Cloudflare /sessions/new with APP_SECRET
                               → returns { sessionId, iceServers (short-lived TURN) }
  2. Browser creates RTCPeerConnection, addTrack(camera, mic), createOffer
  3. POST /api/video/tracks    → server proxies SDP to Cloudflare /tracks/new (publish)
  4. POST /api/video/subscribe → server proxies remote track pull → renegotiate
  5. video_calls.status → 'active', started_at set

During the call:
  - Coach opens the Session plan / log panel
  - Each saved set broadcasts on call:{id}:workout_draft → client strip updates live
  - Nothing is written to workouts yet

On end:
  - video_calls.status → 'ended', ended_at + duration_sec from the call timer
  - Confirm modal → persist workouts + workout_exercises + workout_sets
      with source = 'live_session' and video_call_id = {id}
  - Cloudflare /tracks/close; peer connection disposed; no media retained
```

### Security review

<SECURITY_REVIEW>

| Threat | Control |
|---|---|
| Cloudflare `APP_SECRET` leaking to the browser | All Cloudflare API calls go through Next.js route handlers. `CLOUDFLARE_REALTIME_APP_ID` / `APP_SECRET` are server-only env, asserted present at startup. No `NEXT_PUBLIC_` prefix. |
| **Existing issue:** static TURN credentials shipped to the client | `features/video-call/ice-servers.ts` currently reads `NEXT_PUBLIC_TURN_USERNAME` / `NEXT_PUBLIC_TURN_CREDENTIAL`. Replace with `GET /api/video/ice` returning credentials minted per-call with a short TTL. Remove the three `NEXT_PUBLIC_TURN_*` vars from `.env.example`. |
| Unauthorized join by `callId` guess | Every `/api/video/*` handler re-checks: caller is `coach_id` or `client_id` on the row, relationship is `active`, and `status ∈ ('ringing','active')`. Never trust a client-supplied role. |
| Session-token replay | Cloudflare session ids are per-join and never returned to a non-participant; the server does not accept a client-supplied `sessionId` for authorization decisions. |
| Media interception | DTLS-SRTP end-to-hop; Cloudflare relays ciphertext. No plaintext media at rest or in logs. |
| Accidental recording | No recording API is called. Add a CI grep denying `recording` / `egress` identifiers in `features/video-call/**`, plus a line in the PR checklist. |
| Signaling table abuse (fallback path) | 006 policies already require participant + live status on `webrtc_signals` inserts. Unchanged. |

</SECURITY_REVIEW>

### Quality controls

| Control | Setting |
|---|---|
| Send cap | 720p @ ≤1.2 Mbps via `RTCRtpSender.setParameters({ maxBitrate })` — protects both call quality and SFU egress cost |
| Simulcast | Two spatial layers on publish; the SFU picks per subscriber |
| Audio | Opus, DTX on, echo cancellation + noise suppression via `getUserMedia` constraints |
| Degradation preference | `maintain-framerate` for coaching (movement legibility beats resolution) |
| Connection quality indicator | Poll `getStats()` for RTT / packet loss / jitter; surface the three-state pill from `Mobile-VideoCallCoach.dc.html` |
| Reconnect | ICE restart on `disconnected`; full renegotiate on `failed`; `video_calls.status` stays `active` through a 30s grace window |

### Web → React Native parity

Keep every transport decision in shared, platform-free modules so the Expo app is a rendering change, not a re-architecture.

| Module | Web | React Native |
|---|---|---|
| Call lifecycle queries/actions | `features/video-call/queries.ts`, `actions.ts` | reused via `@omnifit/shared` |
| SFU client (session/track/renegotiate state machine) | new `features/video-call/sfu-client.ts` — pure, injectable `fetch` | reused |
| Peer wrapper | `browser-peer.ts` (`RTCPeerConnection`) | `native-peer.ts` (`react-native-webrtc`), same `PeerConnectionLike` interface that already exists |
| Route handlers | `/api/video/*` | same endpoints, called from the app |
| UI | `Mobile-VideoLobby` / `VideoCallCoach` / `VideoCallClient` / `VideoCallSummary` renders | native screens |

**Out of scope for Phase 2:** group calls (Phase 3, ≤20 participants — the same Cloudflare API, budgeted separately), background call UX / CallKit / ConnectionService, screen share.

---

## Phased delivery

Nine weeks, W0–W8. Each week is independently mergeable; nothing after W3 blocks a demo of what came before.

### W0 — Baseline and gate verification

| # | Task | Acceptance |
|---|---|---|
| 0.1 | `npm run build`, `npm test`, `npm run test:coverage` from repo root; record the baseline | Build green; failing tests listed and quarantined with owners |
| 0.2 | Write gate tests: marketplace off → `/client/discover` and `/c/[handle]` unreachable; video off → `/call/[callId]` unreachable; client open registration blocked | 3 tests red→green (some already pass — keep them as regression guards) |
| 0.3 | Audit `.env.example` against every flag and secret in this plan; remove `NEXT_PUBLIC_TURN_*` | `.env.example` matches the flag table above |
| 0.4 | Confirm migrations 006 / 007 / 091 / 093 / 094 are applied to dev; check `daily_habits` coach-write RLS (M6) | `npm run migrate:check` clean; M6 RLS answer recorded |
| 0.5 | Resolve open decisions O-1, O-2, O-3, O-9 with the product owner | Answers written back into this file |

**Exit:** green build, known test baseline, gates provably on, four decisions closed.

### W1 — Design system foundation

| # | Task | Design source | Acceptance |
|---|---|---|---|
| 1.1 | DS-1…DS-5 token + icon work | `Color-System`, `Typography`, `Icons` | No lime literal remains under `apps/web/src`; icon sprite loads as `currentColor` |
| 1.2 | Build the shared component kit (table above) | `Components-Web.dc.html` | Each component has a colocated test + a visual check against its `.dc.html` |
| 1.3 | Restyle the shell (Sidebar / AppHeader / MobileTabBar) | `Web-Dashboard.dc.html` | Ink-900 rail, pine-filled active item, Go-Pro card, avatar/name/plan footer |
| 1.4 | Restyle the auth suite + `FullPageError` + `InlineEmptyState` | Group A table | Login and Sign up match the split-panel reference |

**Exit:** shell + auth look like OmniFit; component kit is the only way new screens get built.

### W2 — Coach surface restyle

| # | Task | Acceptance |
|---|---|---|
| 2.1 | Dashboard (Group B row 1) | 3 pastel tiles, area chart, donut, clients table, right rail all present; tabular-nums on every figure |
| 2.2 | My Clients + Pending invites | Two-pane at 400px; `ClientRosterRow` used, not a bespoke row |
| 2.3 | Client detail — Overview / History / Analytics | All five tabs render; missed check-in weeks are butter at reduced opacity |
| 2.4 | Log training, Workout library, Tasks, Notes, Messages | One pine CTA per screen |
| 2.5 | Coach profile tabs, Company settings, Subscription billing | Disabled-precondition button state used for "waiting on Stripe" |

**Exit:** a coach can do a full day's work in a fully OmniFit-skinned surface. Touched-slice coverage ≥80%.

### W3 — Client surface restyle

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Client home | Dark calorie hero, 3 pastel quick actions, habits checklist with progress badge |
| 3.2 | Log hub, Log meal, Add product, Saved meals | Running-total footer matches the reference |
| 3.3 | Log body metrics | Front/side/back all required before save (behaviour unchanged, restyled) |
| 3.4 | Client training, Calendar, Request session, Profile tabs | Request-session summary card present |
| 3.5 | Invite accept | End-to-end invite → client home is visually clean |

**Exit:** invite → roster → log → message loop is demo-ready in OmniFit skin.

### W4 — DB-ready gaps: notifications, weekly check-in, assign habits

| # | Task | Acceptance |
|---|---|---|
| 4.1 | M1 notifications slice + route + bell unread dot + Realtime | Marking read clears the dot without a refresh; `href` mapper unit-tested for all 7 kinds |
| 4.2 | M1 producers in messaging / booking / subscription server actions | Each producer has a test asserting `enqueue_notification` is called with the right kind and recipient |
| 4.3 | Migration `097` (+ `098` if needed) with pgTAP | `npm run test:bd` green |
| 4.4 | M5 weekly check-in route + upsert on `(client_id, week_start)` | Submitting twice in one week updates, never duplicates |
| 4.5 | M5 coach-side check-ins bar chart on client detail | Missed weeks visibly distinct |
| 4.6 | M6 assign habits route + coach write path | Coach assigns → client sees it in Today's habits the same day |

**Exit:** three P0 design screens exist; `notifications`, `weekly_checkins`, `daily_habits` all have UI.

### W5 — Payments foundation (no customer-facing checkout yet)

| # | Task | Acceptance |
|---|---|---|
| 5.1 | Stripe server client + startup secret validation | App refuses to boot with a missing `STRIPE_SECRET_KEY` when the checkout flag is on |
| 5.2 | M3 Connect onboarding routes + `account.updated` handling | `coach_profiles.stripe_account_id` populated; `charges_enabled` reflected in the UI |
| 5.3 | M3 webhook with signature verification + idempotent upsert | Replaying the same event twice produces one `payments` row |
| 5.4 | M2 checkout session API (direct charge, `application_fee_amount = 100`) | Stripe test-mode session shows session price + $1; `price_amount = 0` skips checkout entirely |
| 5.5 | `acquisition_fee_owed` branch + unit tests (unreachable in MVP) | Tests prove `coach_invited` never triggers a $10 charge |

**Exit:** money moves correctly in Stripe test mode. Flag still `0`.

### W6 — Checkout UI, receipt, booking inbox, marketing

| # | Task | Acceptance |
|---|---|---|
| 6.1 | M2 checkout screen | Exact §14 labels: "Session price", "Platform service fee — $1.00", "Total due today" |
| 6.2 | M4 receipt, both role views | Coach sees Stripe fee + net payout; client never sees coach net |
| 6.3 | Payment status pill on session rows (Paid / Pending / Refunded) | Pill + label, never colour alone |
| 6.4 | Booking inbox polish (`Web-BookingInbox.dc.html` → `coaching-booking`) | Accept/decline with optional message; both calendars update |
| 6.5 | M7 legal + contact pages, footer wiring, metadata | No `#` links remain in the footer |
| 6.6 | Landing + Pricing copy: Free/Pro, invite-only, $1 fee FAQ | No marketplace, courts, or video claims while those flags are off |
| 6.7 | Flip `NEXT_PUBLIC_STRIPE_SESSION_CHECKOUT_ENABLED=1` | A client can pay for a session end to end in test mode |

**Exit:** monetization is live behind test keys; the marketing site tells the truth.

### W7 — Cloudflare Realtime SFU (web)

| # | Task | Acceptance |
|---|---|---|
| 7.1 | Replace static browser TURN creds with `GET /api/video/ice` (short TTL) | No `NEXT_PUBLIC_TURN_*` anywhere; credentials expire |
| 7.2 | `sfu-client.ts` state machine (session → publish → subscribe → renegotiate → close), pure + injectable `fetch` | Unit-tested without a network |
| 7.3 | `/api/video/*` route handlers with participant re-checks | Non-participant gets 403 on every endpoint (test per endpoint) |
| 7.4 | Lobby / coach view / client view / summary screens | Match `Mobile-VideoLobby`, `VideoCallCoach`, `VideoCallClient`, `VideoCallSummary` |
| 7.5 | Quality controls (bitrate cap, simulcast, degradation preference, quality pill) | Send bitrate never exceeds 1.2 Mbps |
| 7.6 | `NEXT_PUBLIC_VIDEO_TRANSPORT=p2p` fallback still connects | Both transports pass the same E2E call test |
| 7.7 | Network matrix in staging: same LAN, cross-NAT, mobile LTE, corporate TCP:443 | 4/4 connect; median join <3s |

**Exit:** a real 1:1 call works on staging with the flag on. Production flag stays `0`.

### W8 — In-call log, hardening, launch gate

| # | Task | Acceptance |
|---|---|---|
| 8.1 | In-call training log panel + `call:{id}:workout_draft` broadcast | Client strip updates within ~1s of each saved set |
| 8.2 | Persist on end: `workouts.source = 'live_session'`, `video_call_id` set | Workout appears in client history linked to the call |
| 8.3 | No-recording CI check + PR checklist line | Grep denies recording/egress identifiers under `features/video-call/**` |
| 8.4 | a11y pass: landmarks, focus order, 44px targets, WCAG 2.1 AA contrast on pine/plum/pastels | Axe clean on shell, auth, dashboard, checkout |
| 8.5 | Playwright: invite→client home · coach roster · checkout $1 line · notifications read · weekly check-in submit · video call connect (staging) | All green in CI |
| 8.6 | `npm run test:coverage:touched` ≥80%; MVP aggregate ≥80% | Both gates pass |
| 8.7 | Docs sync: supersede `DEVELOPMENT_PLAN.md` §5 and §20.6 with the SFU decision; update `IMPLEMENTATION_PLAN.md` | Docs no longer claim "no SFU" for the web track |

**Exit / launch gate:** OmniFit skin end to end · marketplace and public storefront unreachable · client path invite-only · session checkout shows $1 · notifications and weekly check-in wired · video proven on staging behind a Pro-gated flag · coverage gates green.

---

## Explicit out of scope

| Item | Why | When |
|---|---|---|
| Greenfield rewrite of app logic | Working code + 209 tests + migrated schema already exist | Never |
| Renaming `@coachr/shared` → `@omnifit/shared` across ~469 import sites | Cosmetic; the alias works and the churn would collide with the restyle | Post-launch cleanup |
| Find Coach marketplace, public coach storefront, `/join/[handle]` | Phase 2 per `PRODUCT_DESCRIPTION.md` §7.11 | Phase 2 |
| `platform_sourced` pairings and the **$10** acquisition fee UI | Only reachable with the marketplace on; the code branch ships dormant in W5 | Phase 2 |
| Courts / venues / `places` / organization storefront | Phase 3+ facility product | Phase 3 |
| Team orgs, multi-coach workspace, workspace switcher | Phase 3 per `DEVELOPMENT_PLAN.md` §8 | Phase 3 |
| Group video (>2 participants, ≤20) | Phase 3; same Cloudflare API, separate budget | Phase 3 |
| **Cloud recording of calls · async client video upload · AI form analysis** | Explicitly out of product scope, all phases (`PRODUCT_DESCRIPTION.md` §12) | Never |
| Push notifications (FCM/APNs) | Phase 2 per §7.9; in-app only in MVP | Phase 2 |
| Cal.com integration | `PRODUCT_DESCRIPTION.md` names it, but native `booking_requests` / `sessions` already work; integrating now is a second scheduling source of truth for zero MVP value | Post-launch, see O-6 |
| React Native app | Web first; shared modules keep the port cheap | After W8 |
| Desktop-web barcode scanner | Mobile web only per §9 | — |
| Client-paid platform subscription | Clients are free, all phases | Never |
| Coach ratings / reviews | Phase 2 (Reviews tab ships disabled) | Phase 2 |

---

## Risks and open decisions

### Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Mass restyle breaks the ~209 colocated tests | High | Medium | Screen-by-screen, one slice per PR; run that slice's tests before moving on; never restyle two groups in one PR |
| R-2 | Stripe webhook mis-verification or double-processing corrupts `payments` | Medium | **High** | Raw-body signature verification; unique constraints on both Stripe ids; replay test in W5.3; never downgrade a `succeeded` row |
| R-3 | Direct vs destination charge chosen wrong → platform eats Stripe fees | Medium | High | W5.4 asserts a test-mode balance transaction where the fee lands on the connected account |
| R-4 | SFU egress cost grows faster than modelled | Medium | Medium | 1.2 Mbps send cap; Cloudflare usage alert at 800 GB/mo; `VIDEO_TRANSPORT=p2p` is a one-env-var retreat |
| R-5 | Cloudflare Realtime degradation takes all calls down | Low | High | P2P fallback path stays tested in CI (W7.6), not just present |
| R-6 | Notification producers forget the service-role client and silently no-op (no INSERT policy for `authenticated`) | Medium | Medium | One `enqueueNotification()` wrapper is the only call site; a lint rule denies direct `from('notifications').insert` |
| R-7 | Dual token systems confuse contributors | Medium | Low | Alias layer is documented as temporary; delete `--color-*` once the last screen migrates |
| R-8 | Scope creep into marketplace/video polish | Medium | Medium | The out-of-scope table above is a deny-list, not a suggestion |
| R-9 | Touched-slice coverage gate blocks restyle PRs on untested legacy files | Medium | Low | Restyle PRs touch view files; add the missing colocated test in the same PR rather than waiving the gate |

### Open decisions

| # | Decision | Options | Recommendation | Needed by |
|---|---|---|---|---|
| O-1 | `weekly_checkins` has four fields; the design shows five sliders including **Motivation** | (a) add `motivation` column (b) drop the slider | **(a)** — additive migration `097`, one nullable smallint | W0 |
| O-2 | Migration 094's trigger writes mobile-shaped `href` (`/clients/{id}`) | (a) map in the app (b) change the trigger | **(a)** — a mapper keeps one href contract for web and native | W0 |
| O-3 | Charge model for session payments | direct charge vs destination charge | **Direct charge on the connected account** — matches §4.3 and the `payments` column semantics | W0 |
| O-4 | Does the $1 fee survive a refund? | full reversal / retained / partial | Product call. Default proposal: **reverse the application fee on a full refund, retain on partial** | W5 |
| O-5 | Pay-at-booking vs pay-after-session | `PRODUCT_DESCRIPTION.md` §15.1 | **Pay at booking** — simplest state machine; the session is only confirmed once paid | W5 |
| O-6 | Cal.com now or later | integrate / defer | **Defer** — native booking already works; revisit post-launch | W6 |
| O-7 | Tax / VAT display at checkout | §15.4 | USD-only, no tax line in MVP; Stripe Tax is a later switch | W6 |
| O-8 | Gate live video on Pro tier at GA? | yes / all coaches | **Yes** — §4.2 lists live video under Pro; it also caps rollout blast radius | W7 |
| O-9 | **Pricing conflict.** `Web-Pricing.dc.html` shows Starter $29 / Growth $79 / Studio $199; `PRODUCT_DESCRIPTION.md` §4.2 says Free / Pro / Team | (a) design wins (b) product doc wins (c) hybrid | **(b) product doc wins** — Free / Pro / Team is the monetization contract; the design's three-card layout is reusable with corrected names and copy | W0 (blocks W2.5 and W6.6) |
| O-10 | Where does the coach see incoming booking requests? | dedicated `/coach/bookings` route vs a calendar panel | `Web-BookingInbox.dc.html` reads as a standalone surface → **dedicated route**, linked from the dashboard right rail | W6 |
