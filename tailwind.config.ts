import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // YIBS palette. `brand` is anchored on the crest blue (#29abe2 at 400); 600/700 are
        // deepened so white text on buttons clears WCAG AA, which the crest blue alone does not.
        brand: {
          50: "#eff8fe",
          100: "#d4e9ff",
          200: "#b3ddf7",
          300: "#7fc9f0",
          400: "#29abe2",
          500: "#1490c9",
          600: "#0e73a6",
          700: "#0d5e88",
          800: "#114e70",
          900: "#13425e",
        },
        // Secondary yellow, from the building's vertical band and the school colours.
        accent: {
          50: "#fffbeb",
          100: "#fff3c4",
          200: "#ffe888",
          300: "#ffdd4d",
          400: "#ffcc00",
          500: "#f1c40f",
          600: "#d4a509",
          700: "#a87c07",
          800: "#8a6410",
          900: "#74530f",
        },
        // Page surfaces: white, soft grey, and the light-blue tint.
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8f9fa",
          tint: "#e8f4fd",
        },
      },
    },
  },
  plugins: [],
};

export default config;
