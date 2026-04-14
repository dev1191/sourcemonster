/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: "#FF4D1C",
        secondary: "#0028A2",
        dark: "#020617",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
