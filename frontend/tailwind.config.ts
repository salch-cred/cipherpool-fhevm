import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAF8EE",
        surface: "rgba(255, 255, 255, 0.45)",
        border: "#E9E5D9",
        primary: {
          DEFAULT: "#1A6FD1",
          dark: "#14559F",
          light: "#FDFBEB",
        },
        accent: "#2688DD",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,23,23,0.05)",
        "card-hover": "0 8px 24px rgba(23,23,23,0.08)",
        button:
          "0 2px 3px rgba(0,0,0,0.06), 0 0 0.5px 1.5px rgba(255,255,255,0.35) inset, 0 2px 0 rgba(255,255,255,1) inset",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 50% 0%, rgba(218,165,32,0.12), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
