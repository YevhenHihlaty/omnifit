# OmniFit — Claude Design Prompts (Missing Screens)

> **Date:** 2026-09-20  
> **Purpose:** Paste each prompt into Claude to generate design artifacts for screens that are **missing** from `docs/OmniFit-Design-Screens/`.  
> **Design system source:** [`docs/OmniFit — Design Documentation.md`](../OmniFit%20—%20Design%20Documentation.md)  
> **Product rules:** [`docs/PRODUCT_DESCRIPTION.md`](../PRODUCT_DESCRIPTION.md) — invite-only clients; Free/Pro tiers; Stripe session price + **$1.00** platform service fee  
> **Do not redesign:** Find Coach, public storefront, live video (already designed; Phase 2)

---

## How to use

1. Copy **System prefix** once into the Claude project/custom instructions (or prepend to every prompt).  
2. Run **one prompt per artifact**. Ask for a single high-fidelity screen (web desktop 1440×900 and/or mobile 390×844 as specified).  
3. Export HTML/PNG into `docs/OmniFit-Design-Screens/` using names like `Web-Checkout.dc.html`, `Mobile-Tasks.dc.html`.  
4. Prefer interactive HTML artifacts matching existing `*.dc.html` style when possible.

---

## System prefix (prepend to every prompt)

```text
You are designing OmniFit — a calm, coach-first practice-management product for independent fitness coaches and their invite-only clients.

DESIGN SYSTEM (mandatory):
- Page background cream #FBF7EF; cards/surfaces white #FFFFFF
- Primary action pine #3F6B4F (exactly ONE primary pine CTA per screen)
- Secondary/links plum #7C6A9C
- Text ink #14181C / #3E443F / #6E7268
- Borders stone #E3DECF / subtle fills #F1ECDF
- Pastel card tints (sage, butter, peach, lilac, blush, sky) — one tint per card, never two adjacent same family; never put text color on pastel alone without ink text
- Status = labeled pills (On track / At risk / New / Paid / Pending / Refunded), never color alone
- Typography: Space Grotesk 500–700 for headings and ALL numerals; Inter 400–600 for body/labels (body ≥14px)
- Logo: Orbit mark (pine ring + orbiting dot) — mono-color pine only
- Web coach shell: dark ink-900 left sidebar (~240px), active nav item pine fill, OmniFit wordmark
- Mobile: bottom tab bar; active tab pine
- Inputs 44px tall; focus ring soft pine tint; hit targets ≥44px
- Motion: subtle only; respect reduced-motion; no purple gradients, no neon lime, no Inter-only look, no generic SaaS purple

PRODUCT RULES:
- Clients are invite-only in MVP (no open client marketplace CTAs on these screens)
- Pricing tiers are Free / Pro (not Starter/Growth/Studio). Team = “coming soon” if shown
- Checkout must show: Session price, Platform service fee $1.00, Total due today
- Warm professional tone; scannable ops UI, not marketing fluff on product screens
- Tabular numerals on prices, counts, timers, macros

Output a polished, production-ready UI mock (HTML preferred) that looks meticulously crafted and consistent with OmniFit’s existing screens.
```

---

## P0 — MVP blockers (design first)

### 1. Web + Mobile — Client session checkout

**Filename:** `Web-Checkout` · `Mobile-Checkout`

```text
[SYSTEM PREFIX]

Screen: Client checkout for a coaching session (OmniFit MVP).

Layout:
- Header: session title, coach name, date/time
- Line items (tabular-nums):
  1) Session price — e.g. $80.00 (set by coach)
  2) Platform service fee — $1.00 (fixed, labeled exactly “Platform service fee”)
  3) Total due today — $81.00 (emphasized)
- Primary CTA: “Pay $81.00” (pine)
- Secondary: “Cancel”
- States to show as variants or annotated panels: default, processing, payment failed (danger pill + retry)

Web: centered card on cream within client app chrome (top nav or simple header — no coach sidebar).
Mobile: full-width card above safe-area CTA bar.

Do NOT invent subscriptions for clients. Do NOT show Find Coach.
```

### 2. Web + Mobile — Payment receipt / confirmation

**Filename:** `Web-PaymentReceipt` · `Mobile-PaymentReceipt`

```text
[SYSTEM PREFIX]

Screen: Payment confirmation after successful session checkout.

Client view:
- Success badge (pine check)
- Receipt breakdown: Session price, Platform service fee $1.00, Total charged
- Session details, date, coach
- CTA: “Back to calendar”

Coach view (second frame or toggle):
- Same session
- Show Stripe processing fee (example variable) and Net payout (tabular-nums)
- Label fees clearly; no fake tax unless noted as placeholder

Include a compact reusable “receipt component” matching the Design Doc description.
```

### 3. Web + Mobile — Coach booking request inbox

**Filename:** `Web-BookingInbox` · `Mobile-BookingInbox`

```text
[SYSTEM PREFIX]

Screen: Coach reviews pending session requests from paired clients.

- List of pending requests: client avatar, proposed time, session type, optional note, payment status pill (Unpaid / Pay at booking)
- Detail panel or sheet: Accept (pine) / Decline (outline) + optional message textarea
- Empty state: “No pending requests”
- After accept: show confirmation toast pattern note

Web: inside coach shell (Sessions section).
Mobile: Sessions tab with Pending filter chip.
```

### 4. Web + Mobile — Tasks

**Filename:** `Web-Tasks` · `Mobile-Tasks`

```text
[SYSTEM PREFIX]

Screen: Coach tasks productivity list.

- List rows: title, due date (tabular), optional linked client chip, status (To do / Done)
- Create/edit form: title, due date, type/category, optional client picker, notes
- Complete via checkbox; swipe or overflow to delete on mobile
- Empty state inviting “Create your first task”

Web: own route under coach shell OR panel from Dashboard widget.
Keep dense and scannable — this is an ops tool.
```

### 5. Web + Mobile — Notes (list + editor)

**Filename:** `Web-Notes` · `Mobile-Notes`

```text
[SYSTEM PREFIX]

Screen: Coach notes — free text, optional client link, optional session link.

- List of notes with preview, client name, timestamp
- Editor: title optional, body textarea, client select, “Related session” optional
- Also design the filled “Notes” tab content for Web Client Detail (tab already exists in design; content was missing)

Tone: quiet documentation, not chat bubbles.
```

### 6. Web + Mobile — Notifications center

**Filename:** `Web-Notifications` · `Mobile-Notifications`

```text
[SYSTEM PREFIX]

Screen: In-app notification center opened from the bell.

Kinds: New message, Booking request, Booking accepted/declined, New progress photos, Payment success/failure, Subscription issue.

- Unread / All filters
- Row: icon, title, body, relative time, unread pine dot
- Tap marks read and navigates (show href hint in caption)
- Empty state

Web: dropdown panel from dashboard header bell + full page variant.
Mobile: full screen from bell.
```

### 7. Web — Messages (inbox + thread)

**Filename:** `Web-Messages`

```text
[SYSTEM PREFIX]

Screen: Coach web messaging — parity with Mobile-Messages.

- Two-pane: left conversation list (client avatar, name, last message, unread badge), right thread
- Bubbles: outbound dark/filled, inbound outlined
- Composer: text field, attach, pine send
- Empty inbox state

Must fit coach dark sidebar shell. No video call controls.
```

### 8. Web — Invite accept (client)

**Filename:** `Web-InviteAccept`

```text
[SYSTEM PREFIX]

Screen: Client opens email invite link on web.

Flow frames:
1) Invite preview: coach name/avatar, “You’ve been invited to train with {Coach}”
2) Set password (+ confirm) + agree to Terms
3) Short onboard: primary goal + height/weight (or link to existing mobile onboard steps)
4) Success: “You’re all set” → Go to client home

IMPORTANT: Invite-only. No “Browse coaches” / Find Coach CTA. No open signup.
```

### 9. Web + Mobile — Pending invites (coach)

**Filename:** `Web-PendingInvites` · `Mobile-PendingInvites`

```text
[SYSTEM PREFIX]

Screen: Coach manages pending client email invites.

- Table/list: email, sent date, status Pending, actions Resend / Revoke
- Header CTA: Invite client (email field)
- Free tier hint: “2 of 3 client slots used” (tabular) when relevant
- Empty state

Lives under My Clients.
```

### 10. Web — Company / practice settings

**Filename:** `Web-CompanySettings`

```text
[SYSTEM PREFIX]

Screen: Coach Settings → Company / practice.

Fields: display/legal name, slug, short description, optional logo upload placeholder.
Save (pine). Helper text: used for billing limits and future team features — not a public storefront in MVP.
Show read-only plan badge Free/Pro.
No Team permissions UI.
```

### 11. Web + Mobile — Subscription & billing

**Filename:** `Web-SubscriptionBilling` · `Mobile-SubscriptionBilling`

```text
[SYSTEM PREFIX]

Screen: Coach subscription management.

- Current plan: Free — “Up to 3 active clients”
- Pro card: unlimited clients, deeper analytics, (Phase 2: live video) — monthly price placeholder $29
- CTA: Upgrade to Pro / Manage billing (Stripe Customer Portal)
- Payouts section link: Connect Stripe / payout status
- Align naming to Free / Pro only (not Starter/Growth/Studio)

Web under Settings; mobile under Profile → Settings.
```

### 12. Web — Privacy Policy & Terms of Service

**Filename:** `Web-Privacy` · `Web-Terms`

```text
[SYSTEM PREFIX]

Two marketing-site legal pages using the marketing top nav (Find a coach link visually present but mark as Phase 2 / or omit CTA — prefer omit for MVP honesty).

- Clean typographic legal layout on cream
- Last updated date
- Sections with clear H2s
- Footer with Privacy / Terms / Contact

Use plausible fitness-SaaS legal structure; placeholder counsel note at top is OK.
```

---

## P1 — Web parity for MVP

### 13. Web — Log hub + Log meal + Saved meals + Add product

**Filename:** `Web-LogHub` · `Web-LogMeal` · `Web-SavedMeals` · `Web-AddProduct`

```text
[SYSTEM PREFIX]

Client web logging suite (desktop — NO barcode/webcam scanner).

1) Log hub: cards for Log meal, Log training, Body metrics (+ optional water)
2) Log meal: meal type tabs, search foods, recents, running macro total, Done
3) Saved meals: list + “Log again”
4) Add product manual: name, brand, serving, calories, P/C/F — private item path

Match mobile Log* screens’ information architecture but use desktop two-column density.
```

### 14. Web — Log body metrics + progress photos

**Filename:** `Web-LogBodyMetrics`

```text
[SYSTEM PREFIX]

Client web: log weight + optional circumferences + REQUIRED progress photos front / side / back before save.

- Three photo dropzones with pose labels
- Validation message if any pose missing
- Save disabled until complete
- Tabular-nums on measurements
```

### 15. Web — Workout library / Programs

**Filename:** `Web-WorkoutLibrary`

```text
[SYSTEM PREFIX]

Coach web Programs / Workout library (sidebar already mentions Programs).

- List templates: name, sport type, last used
- Create/edit template: exercises table, save
- “Start log from template” CTA
- Empty state

Align with Mobile-WorkoutLibrary content, desktop layout.
```

### 16. Web — Weekly check-in

**Filename:** `Web-WeeklyCheckin`

```text
[SYSTEM PREFIX]

Client web weekly check-in form (sleep, soreness, stress, energy) each scale 1–5.

- Four labeled sliders or segmented controls
- Optional notes
- Submit (pine)
- Success confirmation

This fills the empty Check-in tab on Web-ClientProfile.
```

### 17. Web — Verify email + Reset password (+ success)

**Filename:** `Web-VerifyEmail` · `Web-ResetPassword` · `Web-ResetPasswordSuccess`

```text
[SYSTEM PREFIX]

Auth marketing/web variants matching Mobile-VerifyEmail, Mobile-ResetPassword, Mobile-ResetPasswordSuccess.

Use two-panel web auth layout from Design Doc (dark brand panel + form) for consistency with Web-Login/Web-SignUp.
```

### 18. Web — Empty states + network error + session expired

**Filename:** `Web-EmptyStates` · `Web-NetworkError` · `Web-SessionExpired`

```text
[SYSTEM PREFIX]

Web system states equivalent to Mobile-EmptyStates, Mobile-NetworkError, Mobile-SessionExpired.

Show 3–4 empty-state compositions for: no clients, no messages, no sessions, no notifications.
Network error and session expired as full-page cards with pine retry / log in again.
```

### 19. Web + Mobile — Coach assign habits

**Filename:** `Web-AssignHabits` · `Mobile-AssignHabits`

```text
[SYSTEM PREFIX]

Coach assigns daily habits to a client (steps, water, sleep target, custom).

- From Client Detail: Habits card with Add habit
- Form: name, unit, target value (tabular), active toggle
- Client will check off on Client Home (already designed) — show a small preview of how it appears for the client

MVP: simple list, not gamification.
```

---

## P2 — Optional polish (after P0/P1)

### 20. Pricing page retarget (Free / Pro)

**Filename:** `Web-Pricing-FreePro` (replace or revise Web-Pricing)

```text
[SYSTEM PREFIX]

Revise marketing Pricing to Free / Pro (+ Team coming soon).

Free: up to 3 active clients; roster, logging, messaging, scheduling.
Pro: higher/unlimited clients; analytics depth; Phase 2 live video note.
Clients never pay a platform subscription.
Keep pine primary CTA “Start free” / “Upgrade”.
Remove Starter/Growth/Studio naming.
```

---

## Priority order to run in Claude

1. Checkout + Receipt  
2. Booking inbox  
3. Web Messages  
4. Web Invite accept + Pending invites  
5. Notifications  
6. Tasks + Notes  
7. Company settings + Subscription billing  
8. Privacy + Terms  
9. Web logging suite (13–16)  
10. Auth/system web parity (17–18)  
11. Assign habits  
12. Pricing Free/Pro revise  

---

## Acceptance for each artifact

- [ ] Uses Pine/Cream/Plum/Ink/Stone tokens only  
- [ ] Space Grotesk numerals; Inter body  
- [ ] One pine primary CTA  
- [ ] Status pills labeled  
- [ ] Invite-only / Free-Pro rules respected  
- [ ] Filename saved under `docs/OmniFit-Design-Screens/`  
- [ ] Linked from Design Documentation when landed  

---

## Out of scope for this prompt pack

- Find Coach / marketplace  
- Coach public storefront  
- Live video lobby/call/summary  
- Coach review/ratings  
- Facility / court / RocketPlay  
- Desktop barcode scanner  
