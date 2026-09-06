import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jira: {
          blue: "#0052CC",
          darkBlue: "#0747A6",
          navy: "#172B4D",
          lightGray: "#F4F5F7",
          border: "#DFE1E6",
          text: "#172B4D",
          subtle: "#6B778C",
        },
      },
    },
  },
  plugins: [],
};
export default config;
