# OmniFit Icon Pack

62 line icons for the OmniFit coaching app, in the same visual language as the app's screens: 24×24 viewBox, 1.8px rounded strokes, `currentColor` so each icon inherits the text color it's placed in (a handful of badge/rating icons are solid-filled instead of stroked).

## Usage

Each icon is a standalone `.svg` file under its category folder — drop it directly into your codebase, or import as a React/Vue component via your usual SVGR/svg-loader pipeline. `sprite.svg` bundles every icon as a `<symbol>` for the classic `<svg><use href="sprite.svg#icon-id"/></svg>` pattern.

Recommended sizing: 16–24px inline with text, 28–36px for tab/nav icons, matching the sizes already used across the OmniFit screens.

## Icons by category

### Meals & Nutrition

- `meals/breakfast.svg` — Breakfast
- `meals/lunch.svg` — Lunch (sandwich)
- `meals/dinner.svg` — Dinner (fork & knife)
- `meals/snack.svg` — Snack (apple)
- `meals/water.svg` — Water / hydration
- `meals/protein.svg` — Protein (chicken)
- `meals/carbs.svg` — Carbs (grain)
- `meals/fat.svg` — Fat (avocado)
- `meals/barcode-scan.svg` — Scan barcode
- `meals/saved-meal.svg` — Saved meal

### Training Types

- `training/strength.svg` — Weight lifting
- `training/running.svg` — Running / cardio
- `training/cycling.svg` — Cycling
- `training/swimming.svg` — Swimming
- `training/yoga.svg` — Yoga / mobility
- `training/hiit.svg` — HIIT
- `training/bodyweight.svg` — Bodyweight (pull-up)
- `training/stretching.svg` — Stretching
- `training/team-sports.svg` — Team sports
- `training/recovery.svg` — Recovery
- `training/walking.svg` — Walking / steps
- `training/general-fitness.svg` — General fitness

### Body & Metrics

- `metrics/scale.svg` — Body weight (kg)
- `metrics/measurements.svg` — Measurements (ruler)
- `metrics/body-composition.svg` — Body composition
- `metrics/progress-photo.svg` — Progress photo
- `metrics/heart-rate.svg` — Heart rate
- `metrics/sleep.svg` — Sleep

### Navigation

- `nav/home.svg` — Home
- `nav/calendar.svg` — Calendar
- `nav/messages.svg` — Messages
- `nav/profile.svg` — Profile
- `nav/settings.svg` — Settings
- `nav/log-plus.svg` — Log / add entry
- `nav/search.svg` — Search
- `nav/notifications.svg` — Notifications

### Coaching

- `coaching/video-call.svg` — Video call
- `coaching/coach.svg` — Coach
- `coaching/client.svg` — Client
- `coaching/check-in.svg` — Check-in
- `coaching/goal.svg` — Goal / target
- `coaching/achievement.svg` — Achievement / trophy
- `coaching/streak.svg` — Streak
- `coaching/session-plan.svg` — Session plan

### Status & Feedback

- `status/check-circle.svg` — Complete / on track
- `status/warning.svg` — At risk / warning
- `status/info.svg` — Info
- `status/star-rating.svg` — Star rating
- `status/lock.svg` — Private / locked
- `status/status-dot.svg` — Status dot
- `status/alert-dot.svg` — Alert dot
- `status/new-badge.svg` — New

### Actions & UI

- `actions/edit.svg` — Edit
- `actions/trash.svg` — Delete
- `actions/share.svg` — Share
- `actions/download.svg` — Download
- `actions/filter.svg` — Filter
- `actions/sort.svg` — Sort
- `actions/close.svg` — Close
- `actions/chevron-right.svg` — Chevron
- `actions/plus.svg` — Add
- `actions/camera.svg` — Camera
