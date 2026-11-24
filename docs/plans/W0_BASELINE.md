# W0 baseline notes (OmniFit rewrite plan)

## Habits RLS (M6)

`bd-scripts/migrations/007_client_nutrition_targets_and_habits.sql` already has:
- `daily_habits_insert_coach` / `update_coach` / `delete_coach`
- Client can insert/update `habit_completions`

**Verdict:** No `098_daily_habits_coach_write.sql` needed for coach assign-habits write path.

## Open decisions locked (from plan)

- O-1: Add `motivation` via migration 097
- O-2: Map notification hrefs in app
- O-3: Direct charge on Connect account
- O-9: Free / Pro / Team (product doc wins)
