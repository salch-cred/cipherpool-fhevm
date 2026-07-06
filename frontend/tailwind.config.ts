import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#030014",
        surface: "#0B0616",
        border: "#1F1633",
        brand: {
          purple: "#7C3AED",
          cyan: "#22D3EE",
          green: "#22C55E",
        },
      },
      backgroundImage: {
        "grid-glow": "radial-gradient(circle at 50% 0%, rgba(124,58,237,0.25), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
