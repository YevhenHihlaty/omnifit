import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pine: {
          DEFAULT: "var(--of-pine)",
          dark: "var(--of-pine-dark)",
          tint: "var(--of-pine-tint)",
        },
        plum: {
          DEFAULT: "var(--of-plum)",
          dark: "var(--of-plum-dark)",
          tint: "var(--of-plum-tint)",
        },
        ink: {
          900: "var(--of-ink-900)",
          700: "var(--of-ink-700)",
          500: "var(--of-ink-500)",
        },
        stone: {
          300: "var(--of-stone-300)",
          150: "var(--of-stone-150)",
        },
        cream: "var(--of-cream)",
        surface: "var(--of-surface)",
        sage: "var(--of-sage)",
        butter: "var(--of-butter)",
        peach: "var(--of-peach)",
        lilac: "var(--of-lilac)",
        blush: "var(--of-blush)",
        sky: "var(--of-sky)",
        warning: {
          DEFAULT: "var(--of-warning)",
          tint: "var(--of-warning-tint)",
        },
        danger: {
          DEFAULT: "var(--of-danger)",
          tint: "var(--of-danger-tint)",
        },
      },
      fontFamily: {
        display: [
          "var(--font-space-grotesk)",
          "var(--font-inter)",
          "Space Grotesk",
          "sans-serif",
        ],
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--of-radius)",
        md: "var(--of-radius-md)",
        lg: "var(--of-radius-lg)",
      },
      transitionDuration: {
        fast: "var(--of-duration-fast)",
        normal: "var(--of-duration-normal)",
      },
      boxShadow: {
        focus: "var(--of-focus-ring)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}

export default config
