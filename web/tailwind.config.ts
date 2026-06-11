import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green:   { DEFAULT: "#084734", 700: "#0a5a42", 900: "#05281d" },
        lime:    { DEFAULT: "#cef17b", deep: "#acd84e" },
        ink:     "#0e1f18",
        paper:   "#eef3ec",
        surface: "#f4f9f5",
        line:    "#e1e9e2",
        muted:   "#5c6b63",
        "success":       "#1a7a4a",
        "success-light": "#e3f0e9",
      },
      fontFamily: { sans: ["IBM Plex Sans", "system-ui", "sans-serif"], mono: ["IBM Plex Mono", "monospace"] },
    },
  },
  plugins: [],
};
export default config;
