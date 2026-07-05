import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base":        "var(--bg-base)",
        "bg-elevated":    "var(--bg-elevated)",
        "bg-hover":       "var(--bg-hover)",
        "border-subtle":  "var(--border-subtle)",
        "border-strong":  "var(--border-strong)",
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted":     "var(--text-muted)",
        accent:           "var(--accent)",
        "accent-hover":   "var(--accent-hover)",
        "accent-bg":      "var(--accent-bg)",
        critical:         "#FF4D6A",
        high:             "#FF8C42",
        medium:           "#FFD166",
        low:              "#06D6A0",
        info:             "#4ECDC4",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
