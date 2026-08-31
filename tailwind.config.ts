import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F6EFE4",
        cocoa: "#2A1B14",
        cinnabar: "#B43C2F",
        gold: "#C4A35A",
        sand: "#E8D9C4",
        parchment: "#FBF6EE",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Outfit"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.28em",
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(42, 27, 20, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
