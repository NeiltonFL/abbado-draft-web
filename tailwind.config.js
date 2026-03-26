/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#EBF4FF", 100: "#D1E5FF", 500: "#2B6CB0", 600: "#1A56A0", 700: "#1A365D", 900: "#0D1B2A" },
      },
    },
  },
  plugins: [],
};
