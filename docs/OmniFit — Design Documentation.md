# OmniFit — Design Documentation

2026-09-20 · @Someone

## Overview & design system

OmniFit is a practice-management product for independent fitness coaches and their clients, built as a matched pair of apps: a mobile app used by both coaches and clients day to day, and a web app used mostly by coaches for the heavier admin work (rosters, scheduling, payouts) plus a small marketing site for signing up new coaches and clients. Everything below documents that whole surface, screen by screen.

### Colors

Warm cream (#FBF7EF) replaces stark white as the base surface. Pine green is the single primary-action color — used once per screen for the one thing the coach or client should do next (schedule, upgrade, pay, invite). A muted plum sits behind it for secondary actions and links. Six pastels (sage, butter, peach, lilac, blush, sky) tint cards, avatars and small illustrations, one per element, never two side-by-side in the same tone family, and never carry text (text on a pastel card stays Ink 900).

| Token | Hex | Role |
| --- | --- | --- |
| Pine | #3F6B4F | Primary actions and the logo mark |
| Plum | #7C6A9C | Links, secondary actions, selected states |
| Ink 900 / 700 / 500 | #14181C / #3E443F / #6E7268 | Body text, hierarchy from headline down to caption |
| Stone 300 / 150 | #E3DECF / #F1ECDF | Borders and subtle section fills |
| Cream / Surface | #FBF7EF / #FFFFFF | Page background / card background |
| Sage, Butter, Peach, Lilac, Blush, Sky | see Color-System page | Card and avatar tints |
| Warning | #B8842A on #F7E5A0 tint | "At risk", pending payment |
| Danger | #C1503D on #F6DAD3 tint | Failed charge, refund, destructive actions |

Status is always shown as a colored pill with a label, never as color alone: pine-tint/"On track" or "Paid", warning-tint/"At risk" or "Pending", danger-tint/"Refunded", lilac/"New".

### Typography

Two families split the job cleanly. Space Grotesk (weights 500–700) carries every heading, the wordmark, and every numeral — stat tiles, prices, percentages — so the product's voice stays consistent all the way down to a single figure. Inter (400–600) sets everything a coach has to read quickly: rosters, notes, receipts, form labels. Body copy never goes below 14px, and line length stays under roughly 70 characters.

### Logo & mark

The mark is called "Orbit": a ring with a dot in its upper-right orbit, drawn as a stroke circle plus a filled circle in the same pine green. The ring stands for the coach's practice, the dot for the client held inside it — one shape that reads as both partnership and stability. Rules: the ring and dot are always the same color (never split two-tone), the mark is never stretched, squashed, shadowed or beveled, and the mark-alone version (no wordmark) is reserved for places the product is already recognized — app icon, favicon, avatar placeholder. At the smallest app-icon sizes the stroke and dot both thicken so the shape survives compression.

### Icon pack

A 62-icon set (in the companion Icon pack page/download) covering meals & nutrition, training types, body & metrics, navigation, coaching, status & feedback, and actions & UI. Every icon is drawn on a 24×24 grid (a few custom icons keep their native viewBox) with a uniform 1.8px rounded stroke and ships as `currentColor`, so it inherits whatever color the screen around it uses — most often Ink 900 or Pine. A handful of icons (protein, carbs, fat, running, yoga, general fitness, bodyweight, recovery, walking) are solid-filled illustrations rather than line strokes, used where a literal, detailed shape reads more clearly than an outline at small size.

### Web components

The coach-facing web app is built from a small shared kit: a primary pine button (one per screen), a secondary outlined button, a plum text-link button, a destructive red button, and a disabled state (gray fill, gray border) for actions waiting on a precondition like connecting Stripe. Inputs are 44px tall with a 1.5px stone border that turns pine with a soft pine-tint focus ring. Toggles are a standard pine/gray pill switch. The client roster row is the core data pattern: circular initials avatar (tinted by pastel), name + plan, last check-in time, a thin progress bar, a status pill, and an overflow (⋯) menu. The sidebar nav is a dark (Ink 900) rail with the active item filled pine. A payment receipt component itemizes session price, platform fee, and Stripe processing fee down to net payout, used anywhere a charge or payout is shown.

## Onboarding & authentication

### Sign up (mobile & web)

Collects first name, last name, email, phone (with a country-code select), password with a live 3-bar strength meter, confirm password, and a pre-checked Terms/Privacy agreement checkbox. **Create account** submits and moves to email verification. **Log in** link at the bottom returns to Login for an existing user. The web version splits into a two-panel layout — a dark brand panel on the left (logo, three checkmarked value props: check-ins/logging, video coaching, automated billing, "no card required") and the form on the right — otherwise the same fields.

### Are you a coach? (mobile, post-signup)

A two-card radio choice — "Yes, I'm a coach" (selected by default, pine border/fill) vs. "No, I have a coach" — each card a full-width tappable region with a description of what that role gets. Tapping a card auto-advances (no separate Continue button); this choice branches the rest of onboarding into the coach flow or the client flow below.

### Log in (mobile & web)

Email + password fields, a show/hide password toggle (eye icon), **Forgot password?** link beside the password label, and the primary **Log in** button. **Sign up** link at the bottom for a new user. Web adds the same dark brand panel, here showing a coach testimonial quote instead of the value-prop checklist.

### Verify your email

An envelope icon, "Check your email" heading, and the address the link was sent to. **Open email app** deep-links to the device's mail client; **Resend email** re-sends the link; "Wrong address? Go back" returns to Sign up to correct it. No status states beyond this — the screen waits for the user to tap the emailed link.

### Reset password

Back chevron, email field, **Send reset link**. Confirmation is a separate **Password updated** screen: a pine checkmark badge, "You can now sign in with your new password," and **Go to log in**.

### Coach onboarding (mobile, 7 steps, progress bar + Skip on every step)

1. **Set up your coaching profile** — photo upload, bio textarea, a specialties tag-picker (type-ahead search against the coach's saved tag library, with an inline "Create tag '…'" option when nothing matches, chips with an ✕ to remove), and an Online training toggle.
2. **Certifications & experience** — a years-coaching pill selector (<1, 1–3, 3–5, 5+), a list of certification cards (name, verified badge, expiry) each removable, and **Add certification**.
3. **Set your pricing** — a list of service rows (name, unit like "per session"/"per month", price, remove button) seeded with 1:1 session/monthly program/nutrition add-on, plus **Add a service**. Copy notes clients see this before booking and it can change anytime. 4–7 continue the same stepper pattern (availability, payout setup, etc., covered under their own screens below) and end at **You're live, Taylor!** — a pine checkmark badge plus a status card confirming profile published & searchable, first client invited (shows the invited email), and next payout date, with **Go to your dashboard** as the single exit.

### Client onboarding — Find a coach (mobile)

A location search field with **Use my location**, filter pills (All specialties / Within 5 mi / Under $80 / Online), and a scrollable list of coach cards: avatar-initials, name, an ONLINE badge when applicable, specialties, star rating, distance, and starting price. Tapping a coach leads into a booking/invite flow that ends at **You're all set, Alex!** — the client's mirror of the coach completion screen, confirming goal, assigned coach (with a checkmark once accepted), and first check-in date, with **Go to your dashboard**.

Across every onboarding step, the pattern is consistent: a step counter + progress bar, an optional **Skip**, one primary dark **Continue** button pinned to the bottom, and a final celebratory summary screen before landing in the real app.

## Coach — mobile app

Bottom tab bar (Home / Clients / Sessions / Messages) is constant across the coach's mobile app; the current tab is pine, others ink-500.

### Home

Greets the coach by name with a notification bell (pine dot = unread). Two stat tiles (Active clients, Sessions today) in pastel cards. **Today's schedule** lists sessions as rows — the in-progress one is dark/inverted with a "Now" pill, upcoming ones are outlined with an "Upcoming" pill — with a **See all** link to Sessions. **Needs attention** surfaces clients with an "At risk" or "New" pill (days since last check-in, or "just joined") and a **My clients** link.

### My Clients

Header shows the active-client count and a **+ Add client** button (opens invite). A search field and filter tabs (All / Needs attention with a count badge / New with a count badge) sit above the roster. Each row: avatar, name, a one-line status detail (calories logged, days since check-in, join date), and a status pill (On track / At risk / New). Swiping a row left reveals a red **Archive** action.

### Client detail (three tabs: Snapshot / History / Analytics)

Header: back, client name, overflow menu. Below the avatar and name is a status pill with the reason ("At risk — no check-in in 6 days"). Persistent footer bar: **Message** (outline) and **Edit plan** (filled).

- **Snapshot** — three stat tiles (streak, weight change, adherence %), a weight-trend line chart (8 weeks), and a Recent activity feed (icon, description, timestamp) for logged meals, missed check-ins, completed workouts.
- **History** — the same activity feed grouped by day (Today / Yesterday / …) with filter pills (All / Food / Training / Metrics / Date range).
- **Analytics** — an adherence donut (% + "X of Y workouts logged"), a 90-day weight-trend chart, a three-column measurements card (waist/chest/arm, each with its own mini sparkline), a progress-photos comparison strip with **Compare check-ins**, and a training-volume bar chart (8 weeks).

### Calendar / Sessions

Week strip (day-of-week + date, a pine dot marks days with sessions; today is filled pine) plus Week/Month toggle and a **+** button to schedule a session. Below, the selected day's sessions are listed as color-coded agenda rows (colored bar + tinted card per session) showing client name, session type, and duration.

### Messages

A standard per-client thread: header (avatar, name, "Active … ago", a client-details button), a scrolling bubble thread (incoming left/outlined, outgoing right/dark-filled) with a "Delivered" receipt, and a composer with an attach-file button, text field, and a pine send button.

### Log training — select client

A client picker for logging a session on someone's behalf: search field, then a list of client rows (avatar, name, "Last workout: …") where tapping selects (pine ring + checkmark) and the bottom button updates to **Next — {name}**.

### Live video session (coach view)

A video dock up top: the client's avatar tile, an elapsed-time pill, the client's name label, the coach's own small self-view tile, a mute button, and a red **End call** button. Below, a **Session plan** checklist synced to the client's programmed exercises — each row shows the exercise, its sets/reps/weight, and a checkbox the coach ticks off live; the current exercise is highlighted pine-tint with "in progress." **Add note for Alex** at the bottom logs a coaching note tied to the session.

### Coach profile (tabs: Plans / Locations / Credentials / Settings)

Shared header across all four: avatar, name, rating + active-client count, specialty tag chips, **Edit profile**.

- **Plans** — editable list of services/prices (mirrors onboarding's pricing step) with **+ Create plan** and a pencil-edit icon per row.
- **Locations** — list of coaching locations (studio address, Online/Remote, home-visit radius) each with a **Primary** badge or a remove button, plus **+ Add location**.
- **Credentials** — three collapsible accordions (Certificates, Experience, Education), each row showing an icon, title, and date range/expiry.
- **Settings** — toggle rows (Push notifications, Email digest, Available for booking), link rows to Payouts and Help & support, a **Sign out** button, and the app version number.

### Coach public profile (as seen by a client)

A gradient header banner, avatar overlapping it, name, rating/location/years-coaching line, specialty chips, and three tabs (About / Plans / Reviews). About shows a bio paragraph plus Credentials and Locations cards. Footer actions: **Message** and a filled **Request session**.

### Coach onboarding steps not covered above

Step 4 **Your weekly availability** — a day-by-day list (Mon–Sun) each with a time range and an on/off toggle, plus an auto-detected time-zone notice. Step 5 **Connect your payouts** — a single "Link a bank account" card explaining weekly Friday deposits and encryption, with **Connect bank account** or **Continue without connecting**. Step 6 **Invite your first client** — a shareable coach code ("TAYLOR-4F2K") with **Copy code**, or an email-invite field with its own **Send** button. Step 7 **Review your profile** — a read-only summary card (experience, pricing, availability, payout status) ending in **Launch my practice**, which leads to the "You're live" completion screen documented above.

## Coach — web app

The coach web app is the desktop counterpart to the coach mobile app, built for the heavier daily work of managing a full client roster: reviewing dashboards, logging workouts on a client's behalf, and configuring a public booking profile. Every screen shares the same shell: a fixed 220–260px dark (ink-900) sidebar on the left with the OmniFit logo, a primary nav (Dashboard, My Clients, Sessions, Programs, Messages), a secondary "General" group (Reports, Settings), a "Go Pro" upgrade card, and the signed-in coach's avatar/name/plan footer at the bottom. The active nav item is highlighted with a pine-green fill.

### Dashboard

The coach's home screen, greeting them by name ("Good morning, Taylor") with a one-line summary of the day's workload (sessions and check-ins to review). The header includes a client search field, a notifications bell (with an unread dot) and a "+ New session" button.

Three summary tiles across the top show Active clients (with a mini sparkline and month-over-month change), Sessions in the last 30 days, and Average client streak — each on a distinct pastel background (sage, peach, butter).

Below that, a two-column layout: on the left, a "Check-in activity" area chart comparing this week's check-ins per day against last week (dashed line), with a callout tooltip on the peak day, followed by a "Client status" donut chart breaking the roster into On track / At risk / New with a percentage legend and a "View clients at risk →" link. Beneath both, a "Your clients" table (All / Needs attention filter pills) lists each client's avatar, name, program, last check-in time, a progress bar, and a status pill (On track/At risk/New), with a "View all" link to My Clients.

The right column holds a month calendar (with dots marking days that have sessions and a "+ Schedule a session" button), a "Today's schedule" list of the day's sessions each tagged Done/Now/Next, and a "Recent messages" preview with a link to the full inbox.

### My Clients

A two-pane clients workspace. The left pane (400px) has a search field, All / Needs-attention filter tabs, and a scrollable list of client rows (avatar, name, one-line detail, status pill). Selecting a row fills the right preview pane with that client's avatar, name, goal line, Message and "View full profile" buttons, three stat tiles (Streak, Weight, Adherence), a weight-trend line chart, and a recent-activity feed. The header has an "+ Add client" button and a running client count.

### Client detail

Opened from "View full profile," this is the coach's full working view of one client. A breadcrumb link returns to My Clients. The header shows the client's avatar, name, a status pill (e.g. "At risk"), a goal/coaching-type/reason line (e.g. "no check-in in 6 days"), and Message + "Edit plan" buttons. Below the header sit five tabs: Snapshot (labeled "Overview" in some screens), History, Analytics, Messages, and Notes.

**Overview/Snapshot tab** — four stat tiles (Streak, Weight change, Adherence, Sessions completed as "11 / 14"), an 8-week weight-trend chart, a weekly check-ins bar chart where missed weeks render as reduced-opacity butter-colored bars, and a recent-activity feed. A right-hand column holds three cards: Client info (goal, program, started date, email, tag chips), Upcoming session (colored bar with date/time/session type), and Coach notes (free-text).

**Analytics tab** — an Adherence ring chart (percentage over the last 30 days), a weight-trend line chart, a training-volume bar chart (sets completed per week, with a highlighted missed week in butter), a three-photo progress grid (Front/Side/Back placeholders), and a right column of four measurement tiles (Waist, Hips, Chest, Arms) each with a small trend sparkline, plus a Measurement notes card.

**History tab** — a reverse-chronological activity log grouped by day (Today, Yesterday, 2 days ago…) in two columns, filterable by All / Food / Training / Metrics pills and a date-range selector ("Last 30 days"). Each row shows an icon, an action description (e.g. "Logged breakfast," "Weight logged," "Completed workout," "Missed check-in"), a detail line, and a timestamp.

### Log training

A tool for the coach to record a workout on a client's behalf. The left pane (340px) lists clients with a search field and each row showing avatar, name, and last-workout recency; the selected client is highlighted with a checkmark. The right pane shows the selected client's name and the log date, a row of sport-type chips (Strength active, Running, Cycling, Swimming, Mobility), and an editable exercise table (Exercise / Sets / Reps / Weight columns, each cell an inline input, with a ✕ remove button per row) plus an "+ Add exercise" button. A notes field lets the coach leave a message for the client. The footer has Cancel and "Save workout" buttons.

### Coach profile — Settings tab

The coach's own profile management screen, reached from the sidebar's Settings item. The header shows the coach's avatar, name, specialty tag chips, a "View public profile →" link, and an "Edit profile" button, with four tabs: Plans, Locations, Credentials, and Settings (shown active). The Settings tab has a Notifications group (Push notifications, Email digest, Available for booking — each a toggle switch, all on by default), an Account group of link rows (Payouts & billing, Team & permissions, Help & support, each with a chevron), a red "Sign out" text button, and an app-version footnote.

### Coach public profile

The client-facing version of a coach's page, reached via a shareable link or Find a Coach — it uses the marketing site's top nav (Find a coach / How it works / Pricing, Log in, Sign up) rather than the app sidebar, with a pine gradient cover band. Below the cover: the coach's avatar, name, a star rating with review count, location and years-coaching line, and specialty tag chips. Three tabs — About, Plans, Reviews (Reviews shown disabled/coming soon) — with About active by default, showing a bio paragraph, a Credentials card (certification name + year), and a Locations card (Online/remote marked "Primary," plus any physical gym location). A sticky right-hand card shows the entry price ("$180 / month") and program name, with "Request session" and "Message" buttons and a typical-response-time note.

### Help center

OmniFit's self-serve documentation site (also linked from the marketing footer's "Docs" link), using the marketing top nav plus a large search field ("How can we help?"). A left sidebar groups articles under Getting started, Working with clients, Billing, and Account; the active article ("Create your coach account") is highlighted. The article body walks through the three onboarding steps — signing up, building a public profile, and setting availability & session types — with a highlighted tip callout, a "Was this article helpful?" Yes/No prompt, and a right-hand "Related articles" list plus a "Contact support →" card.

## Client — mobile app

The client mobile app is where members log their day, follow their training, and stay in touch with their coach. Every logged-in screen shares a bottom tab bar (Home, Log, Progress/Calendar, Coach) with the active tab highlighted in pine green.

### Client onboarding: goal, profile & connecting with a coach

After role selection and sign-up, a client completes a 3-step stepper (progress bar at top, current step labeled "Step X of 3"):

1. **Primary goal** — a single-select radio list of Weight loss, Muscle gain, General conditioning, or Something else, each option showing an icon and a one-line description of what that goal emphasizes (e.g. "Calorie tracking, weekly check-ins" for Weight loss). The selected card is outlined in pine with a checkmark badge.
2. **Tell us about you** — a unit toggle (lb/ft vs kg/cm), height and weight fields, date of birth, and an Activity level picker (Sedentary, Light, Moderate, Very active) shown as a 2×2 grid of cards with a small bar-chart icon indicating relative activity.
3. **Connect with your coach** — an invite-code field (e.g. "TAYLOR-4F2K") that resolves to a coach-match confirmation card once a valid code is entered (avatar, name, "Coach found — code matches"), an "or" divider, and a "Browse coaches on OmniFit" button leading to Find a Coach. A "Skip for now" link is available. "Continue" completes onboarding and lands on Client home (see Onboarding & authentication for the Find a Coach and completion screens).

### Home

Greets the client by first name ("Good morning, Devon") with an avatar in the corner. A dark calories card shows today's intake against the daily target with a progress bar and a protein/carbs/fat breakdown. Three quick-action tiles (Log meal, Log training, Body metrics) sit below on distinct pastel backgrounds. A "Today's habits" checklist (e.g. "Drink 8 glasses of water," "Hit 8,000 steps," "Sleep 7+ hours") lets the client check off daily habits directly. An "Upcoming session" card shows the next scheduled session with the coach and a Join button when it's a video session.

### Log activity (hub)

Reached from the Log tab. Four large action cards — Log meal, Log workout, Body metrics, Water — each on a distinct pastel tint with an icon. Below, "Today's log" lists everything logged so far today (meals, workouts, water) with icon, description, and timestamp, each row navigable via a chevron.

### Log meal

Tabs for Breakfast/Lunch/Dinner/Snack, a food search field, and a "Frequently logged" list of past foods with quantity and calories; tapping the + button on a row adds it instantly (shown with a checkmark and highlighted background once added). A footer summarizes the running total ("150 cal added · 1 item · Breakfast") with a Done button.

### Meal item detail

Opened when adding a specific food: shows the food's icon, name, and brand, a stepper to adjust serving size/quantity, the resulting calorie and macro breakdown (Protein/Carbs/Fat tiles), and a meal-type selector, ending in an "Add to meal" button.

### Saved meals

A library of the client's frequently-logged meals, searchable and filterable by meal type (All/Breakfast/Lunch/Dinner), each row showing an icon, name, calories, and how many times it's been logged, with a quick-add button.

### Add product manually

A form for foods not found in search: product name, optional brand, serving size/unit, and per-serving nutrition (calories, protein, carbs, fat), with a checkbox to save it to the client's personal food library, ending in "Add to log."

### Scan barcode

A full-screen camera scanner (dark background) with a viewfinder frame and animated scan line, a flash toggle, and a close button. A caption explains the scan-to-lookup behavior, with a fallback "Enter barcode manually" button.

### Body metrics

A weight-entry screen with a large numeric input and lb/kg unit toggle, a date picker ("Recording for"), optional measurement fields (body fat %, waist, chest, hips), and an optional progress-photo upload, ending in "Save entry."

### Log training (client)

Sport-type chips (Weight Lifting active, Running, Cycling, Swimming, General) and a choice between "Blank workout" or "From template," with a horizontal list of recent templates for quick-start. An editable exercise table (Exercise/Sets/Reps/Weight) with an "Add exercise" button, ending in "Save workout" and a secondary "Save as workout template" action.

### My workouts

The client's saved workout templates, each card showing an icon, name, exercise count, and last-used date, with a Start button per card and a "+ New template" action at the bottom.

### Training hub

The Training/workout landing screen: an "Up next" card naming the next scheduled session with the coach, a prominent "Start workout" button, and a "Recent workouts" list with a link to My workouts.

### Calendar

Day/Week/Month segmented control, a horizontal strip of day chips (selected day highlighted in pine), and an agenda for the selected day showing scheduled sessions (highlighted pine card with time, title, and location/format) or a "No other sessions today" placeholder, followed by an "Upcoming" list of confirmed future sessions. A "Request session" button in the header opens the scheduling flow.

### Request a session

Shows the selected coach with a "Change" link, a date field, a grid of time slots (available/selected/taken states), a session-type chip picker (preset types or "Write my own" with a free-text field), a duration note pulled from the coach's plan, and an optional notes field, ending in "Request session" with a note that the coach must confirm before it's added to the calendar.

### Weekly check-in

A short-form survey ("takes under a minute") with five labeled sliders — Sleep quality, Muscle soreness, Stress level, Energy, Motivation — each showing a live numeric score (X / 5) as it's dragged, ending in "Submit check-in."

### Profile (Goals / Progress / History / Check-in tabs)

The client's own profile hub, showing their avatar, name, and coach ("Coached by Taylor Brooks"), with four tabs:

- **Goals** — the primary goal card (icon, target description, target date, progress bar, and an "On track" status line) plus a Weekly targets card listing workouts/steps/check-ins completed vs. target.
- **Progress** — a check-in-due reminder banner, a 90-day weight trend chart, a measurements grid (Waist/Chest/Arm/Weight), and a horizontally scrollable photo timeline with an add-photo tile.
- **History** — a reverse-chronological, day-grouped activity log filterable by All/Food/Training/Metrics, listing meals, workouts, weight entries, and check-in submissions with timestamps.
- **Check-in** — (referenced from this tab) opens the Weekly check-in flow described above.

## Client — web app

The client web app mirrors the client mobile app's functionality on desktop, sharing the same 220px dark sidebar pattern as the rest of the app (logo, Home/Log/Calendar/Progress/Coach nav, and the signed-in client's avatar/name/role footer, labeled "Client").

### Home

Greets the client by name with the day's date. A dark hero card shows calories consumed today against the daily target with a progress bar and protein/carbs/fat totals. Three quick-action tiles (Log meal, Log training, Body metrics) sit below. A weight-trend chart (last 8 weeks) and a "Today's habits" checklist (e.g. "Log breakfast," "30 min movement," "8 cups of water," "Evening stretch") with a circular "X of 4 done" progress badge occupy the main column. A right column shows an "Upcoming session" card (time, type, coach) and a Messages preview with a "View all" link.

### Training

An "Up next" hero card names the next assigned workout with exercise count, estimated duration, and who assigned it, plus a prominent "Start workout" button. Below, a "Start something else" row of template cards (Blank workout plus saved templates) and a "Recent workouts" list with exercise count and duration. A right column shows a "This week" progress card (workouts completed vs. target, with a progress bar) and a training-volume bar chart.

### Calendar

Week/Month segmented toggle and a "Request session" button in the header. The month view is a full calendar grid with dots marking days that have sessions; selecting a day fills a right-hand agenda panel showing that day's sessions (a highlighted pine card with time, title, and coach) or a "No other sessions today" placeholder, followed by an "Upcoming" list of confirmed future sessions.

### Request a session

Shows the selected coach with a "Change" link, a row of selectable day chips, a grid of time slots (available/selected/taken), a session-type chip picker (preset types or a free-text "Write my own" option), a duration note pulled from the coach's plan, an optional notes field, and a summary card recapping date/time/duration/type before the "Request session" button. A footnote clarifies the coach must confirm before it's added to the calendar.

### Profile

Shows the client's avatar, name, and coach attribution ("Coached by Taylor Brooks"), with four tabs: Goals (shown), Progress, History, and Check-in — mirroring the mobile profile's four tabs. The Goals tab shows a highlighted primary-objective card with a progress bar and percentage-to-goal, a "Weekly targets" card listing workouts/meal-logging/check-in targets against actuals, and a right column with a Quick stats card (member since, program, streak) and a "Message Taylor" contact card with typical response time. The Progress, History, and Check-in tabs follow the same content as their mobile counterparts (see Client — mobile app): a weight/measurements/photo timeline, a filterable day-grouped activity log, and the weekly check-in survey, respectively.

### Coach's public profile (client-facing)

When browsing or reviewing a coach from the client side — via Find a Coach or a shared link — clients see the same public profile page documented under Coach — web app → Coach public profile: cover band, avatar, rating, About/Plans/Reviews tabs, and a sticky pricing card with Request session and Message actions.

## Shared, error & empty states

These screens and patterns are shared across roles rather than belonging to one flow — system-level errors, permission prompts, empty-state patterns, and the live video-session experience.

### Full-page error states

All follow one template: a faded logo at top, a centered icon in a circular tinted badge, a bold headline, a one-line explanation, and a single primary action button.

- **No connection** — shown when the network drops; a crossed-out signal-waves icon, "Check your network and try again," and a Retry button.
- **Session expired** — a clock icon on a butter-tinted badge, "Please sign in again to keep going," and a Log in button.
- **Location access needed** — shown from Find a Coach when location permission is required; a crossed-out pin icon, an explanation that location helps find nearby coaches, an "Open settings" button, and a secondary "Not now" dismiss link. Has a close button and title bar instead of the faded-logo header, since it's presented as a modal over Find a Coach.
- **Barcode not found** — shown from the barcode scanner when a lookup fails; a crossed-out barcode icon, an explanation, the scanned barcode number in a monospace chip, and two actions: "Add manually" (primary) and "Scan again" (secondary).

### Inline empty states

A reusable pattern for empty lists/sections embedded within a parent view (not full-page): an icon, a bold headline, a one-line body, and a single contextual call-to-action button. Documented examples include: no meals logged yet (in the calorie tracker, CTA "Log meal"), no sessions scheduled (in the calendar, CTA "Request session"), no clients yet (in the coach's client list, CTA "Share profile link"), and no coaches found (in Find a Coach, CTA "Expand search").

### Live video session

A four-step flow for video coaching sessions:

1. **Video call lobby** — a pre-join screen (dark background) showing the user's own camera preview, mic/camera toggle buttons, the session name and coach/client pairing, a "waiting room" status indicator when the other party hasn't joined yet, and a "Join call" button.
2. **Live session — coach view** — a compact video dock (client's video large, coach's own small picture-in-picture, a call timer, the client's name label, and mic/end-call controls) above a scrollable "Session plan" panel: a checklist of the session's planned exercises (with sets/reps/weight) that the coach checks off as the client completes them, one marked "in progress" and highlighted. An "Add note for Alex" button lets the coach leave a note visible in the session summary.
3. **Live session — client view** — a full-screen video call (coach's video fills the screen, client's own picture-in-picture in the corner), a call timer, a chat button, and a control bar with mic, camera, switch-camera, and end-call buttons.
4. **Session summary** — shown after the call ends: a success checkmark, session title and coach name, three stat tiles (Duration, Exercises completed, Sets logged), a checklist recap of what was covered (completed items checked, skipped items shown unchecked/greyed), a highlighted "Note from Taylor" card with the coach's post-session comment, and "Schedule next session" (primary) plus "Back to home" (secondary) actions.

## Marketing web pages

OmniFit's public-facing marketing site, aimed at prospective coaches (the paying customer). Every page shares a consistent top nav (logo, Product/Pricing/About links, Log in, and a "Start free trial" button) and a consistent footer (logo blurb, Product/Company/Legal link columns, copyright line).

### Landing page

A hero section pairs a headline ("Built for the relationship between coach and client") and supporting copy with a live-look mock of the coach dashboard — stat tiles and a check-ins area chart — plus "Start free trial" and "Watch a demo" buttons and a no-credit-card note. A stats strip shows platform-wide numbers (500+ coaches, 12,000+ clients coached, 340,000+ check-ins logged, 4.9/5 average rating). A three-card features section ("Built for the relationship," "Your whole practice, at a glance," "Get paid without the chase") each pairs an icon with a short benefit statement. A highlighted testimonial quote from a named coach (with avatar, name, and practice size) sits in a tinted card. A dark CTA band ("Ready to grow your coaching practice?") repeats the free-trial button before the footer.

### Pricing

A centered header ("Simple pricing that scales with your practice") with a Monthly/Annual (save 20%) toggle above three plan cards: Starter ($29/mo, up to 8 clients), Growth ($79/mo, up to 40 clients, marked "Most popular" with a distinct dark background and highlighted CTA), and Studio ($199/mo, unlimited clients, multi-coach seats, "Talk to sales"). Each card lists its included features as checkmarked rows, with higher tiers noting "Everything in \[lower tier\]" plus their additions. A three-question FAQ accordion-style list (switching plans, exceeding the client limit, whether clients pay) follows, then the same free-trial CTA band and footer as the landing page.

### Find a coach

Browsed either from the marketing site or, for logged-in clients, from inside the app shell (sidebar with Home/Log/Calendar/Progress/Coach nav, Coach tab active). A location search field ("City or zip code") with a "Use my location" button, and specialty filter pills (All specialties, Strength, Nutrition, Mobility & Recovery, Endurance). Results render as a grid of coach cards, each with avatar, name, specialty, a star rating with distance, a monthly price, and a "View profile" button leading to the coach's public profile (see Coach — web app → Coach public profile).

### Contact

A centered header ("Get in touch") above a two-column layout: a contact form (name, email, a reason-for-contact dropdown, and a message textarea, ending in "Send message") alongside an info column of three cards — Email us, Talk to sales (with a "Book a call" link, positioned for Studio-plan prospects), and Support hours — plus a tinted card pointing to the help center ("Browse the docs").

### Help center (Docs)

See Coach — web app → Help center for the full description: a searchable, sidebar-navigated documentation site reached from the marketing footer's "Docs" link, covering Getting started, Working with clients, Billing, and Account topics.

### Sign up / Log in

The coach- and client-facing authentication pages (Sign up, Log in, Reset password) are documented in Onboarding & authentication. Log in follows the same split-panel pattern as Sign up: a dark brand panel (logo, a testimonial quote, copyright) beside a form panel with Email and Password fields, a "Forgot password?" link, a "Log in" submit button, and a "Don't have an account? Sign up" footer link.
