import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        teal: {
          500: "#0D9488",
          600: "#0F766E",
          700: "#115E59",
        },
        ice: {
          50: "#F0F9FF",
          100: "#E0F2FE",
        },
        coral: {
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        contrast: {
          black: "#000000",
          yellow: "#FACC15",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
