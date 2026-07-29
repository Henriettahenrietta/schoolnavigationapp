import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#bcd7ff",
          300: "#8ebdff",
          400: "#5996ff",
          500: "#316dff",
          600: "#1a4ff5",
          700: "#143de1",
          800: "#1734b6",
          900: "#19318f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
