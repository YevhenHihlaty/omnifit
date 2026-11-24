/**
 * Vitest config — unit/component tests + MVP slice coverage thresholds.
 *
 * Coverage scopes (do not conflate):
 * - MVP slice aggregate: coverage.include/exclude below (~80% gate via thresholds)
 * - Touched slice: per changed file — `npm run test:coverage:touched`
 * - Global whole-src: informational — `npm run test:coverage:global`
 *
 * @see docs/COVERAGE_POLICY.md
 */
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const frontendRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(frontendRoot, "src"),
    },
  },
  test: {
    globals: true,
    // Vitest 3: projects replace deprecated environmentMatchGlobs.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          globals: true,
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      // Windows / parallel I/O: avoid ENOENT races on coverage/.tmp/coverage-*.json
      processingConcurrency: 1,
      reporter: ["text", "json-summary"],
      include: [
        "src/features/**/*.{ts,tsx}",
        "src/components/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/testing/**",
        // Next.js route shells — covered by feature view tests and E2E
        "src/app/**",
        "src/proxy.ts",
        // Static translation catalogs
        "src/lib/i18n/messages/**",
        // Thin re-exports / barrel indexes
        "src/lib/i18n/index.ts",
        "src/lib/utils.ts",
        "src/lib/routes.ts",
        "src/lib/motionTokens.ts",
        "src/components/ui/index.ts",
        // Server/client-only stubs — cannot run in vitest node/jsdom
        "src/lib/i18n/get-server-translator.ts",
        "src/lib/i18n/locale-store.ts",
        // Light provider shell
        "src/components/providers/**",
        // Thin Supabase client factories
        "src/lib/supabase/**",
        "src/configs/**",
        // Server-only auth helpers — require Supabase client; covered by integration tests
        "src/lib/auth/get-app-user.ts",
        // Auth form components — complex UI owned by js-dev; covered by E2E
        "src/components/auth/LoginForm.tsx",
        "src/components/auth/RegisterForm.tsx",
        // App chrome layout — low logic density
        "src/components/shell/**",
        // Server actions — call redirect() + Supabase; tested via E2E
        "src/features/auth/actions.ts",
        "src/features/coach-onboarding/complete-coach-onboarding.ts",
        // Sprint 3 invite / settings interactive surfaces — covered by action unit tests + E2E
        "src/features/client-invite/ClientInviteAcceptPanel.tsx",
        "src/features/client-invite/InviteClientDialog.tsx",
        "src/features/client-invite/PendingInvitesList.tsx",
        "src/features/client-settings/MyCoachesView.tsx",
        "src/features/client-invite/labels.ts",
        "src/features/client-invite/send-client-invite-emails.ts",
        "src/features/client-invite/queries.ts",
        "src/features/client-invite/get-client-invite-preview.ts",
        // Async onboarding gates/shells — server composition wrappers
        "src/features/**/*OnboardingGate.tsx",
        "src/features/**/*OnboardingShell.tsx",
        "src/features/**/*OnboardingStepView.tsx",
        "src/features/**/*Interactive.tsx",
        "src/features/**/CoachOnboardingCompleteForm.tsx",
        "src/features/**/ClientOnboardingFlow.tsx",
        "src/features/coach-onboarding/CoachOnboardingFlow.tsx",
        "src/features/coach-onboarding/CoachOnboardingStepPanels.tsx",
        "src/features/coach-onboarding/CoachOnboardingProfilePanel.tsx",
        "src/features/coach-onboarding/CoachOnboardingPracticePanel.tsx",
        "src/features/coach-onboarding/CoachOnboardingProfilePhoto.tsx",
        "src/features/coach-onboarding/CoachOnboardingRepeatableList.tsx",
        "src/features/coach-onboarding/CoachOnboardingFormField.tsx",
        // Sprint 2 client panels — server-action wrappers with transitions
        "src/features/coach-onboarding/CoachOnboardingProfilePanel.tsx",
        "src/features/coach-onboarding/CoachOnboardingPracticePanel.tsx",
        "src/features/coach-clients/CoachClientsRouteError.tsx",
        "src/features/coach-clients/CoachClientsLoadingSkeleton.tsx",
        // Sprint 9 booking interactive surfaces + server I/O — pure helpers gated below
        "src/features/coaching-booking/CoachSessionsView.tsx",
        "src/features/coaching-booking/ClientCalendarView.tsx",
        "src/features/coaching-booking/actions.ts",
        "src/features/coaching-booking/queries.ts",
        "src/features/coaching-booking/labels.ts",
        // WebRTC slice — quarantined from MVP gate until Sprint slice is stable
        "src/features/video-call/**",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
