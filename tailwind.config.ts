import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mimo: {
          bg: "var(--mimo-bg)",
          fg: "var(--mimo-fg)",
          card: "var(--mimo-card)",
          muted: "var(--mimo-muted)",
          border: "var(--mimo-border)",
          soft: "var(--mimo-border-soft)",
          surface: "var(--mimo-surface)",
          title: "var(--mimo-title)",
          nav: "var(--mimo-nav)",
        },
        duo: {
          bg: "#131f24",
          surface: "#1e2a32",
          card: "#202f36",
          border: "#37464f",
          green: "#58cc02",
          greenDark: "#46a302",
          greenText: "#215c00",
          purple: "#ce82ff",
          orange: "#ff9600",
          blue: "#1cb0f6",
          gold: "#ffc800",
          muted: "#afafaf",
        },
      },
      boxShadow: {
        "duo-green": "0 4px 0 #46a302",
        "duo-blue": "0 4px 0 #1899d6",
        "duo-orange": "0 4px 0 #e08600",
        "duo-purple": "0 4px 0 #a568cc",
        "duo-gray": "0 4px 0 #2d3d45",
      },
    },
  },
  plugins: [],
};
export default config;
