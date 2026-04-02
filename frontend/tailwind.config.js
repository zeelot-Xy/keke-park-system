/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // Enables dark: prefix
  theme: {
    extend: {
      colors: {
        primary: "#FFED00",
        secondary: "#1A1A1A",
        go: "#008000",
      },
    },
  },
  plugins: [],
};
