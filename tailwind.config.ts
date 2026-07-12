/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
        },
        line: "var(--border)",
        strong: "var(--border-strong)",
        ink: "var(--ink)",
        body: "var(--body)",
        muted: "var(--muted)",

        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "var(--primary-hover)",
          tint: "var(--primary-tint)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          hover: "var(--success-hover)",
          tint: "var(--success-tint)",
        },
      },
      borderColor: {
        line: "var(--border)",
        strong: "var(--border-strong)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "heading-lg": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "heading-sm": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "16px", fontWeight: "600" }],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};