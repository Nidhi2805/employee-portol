export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6366f1", dark: "#4f46e5" },
        surface: { DEFAULT: "#f8fafc", dark: "#1e293b" },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};