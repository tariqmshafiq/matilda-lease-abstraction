/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Near-black used for primary text & headings
        ink: {
          DEFAULT: "#1A1A1A",
          soft: "#3F3F46",
          hover: "#000000",
        },
        // Violet brand accent (Matilda)
        brand: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          ink: "#5B21B6",
          soft: "#EDE9FE",
          softer: "#F5F3FF",
        },
        // Off-white surfaces with a faint lavender tint
        canvas: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAFA",
          muted: "#F4F2FA",
        },
        line: {
          DEFAULT: "#ECEAF3",
          strong: "#DEDCEA",
        },
      },
      fontFamily: {
        heading: ["Instrument Serif", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "14px",
        lg: "18px",
        xl: "22px",
        "2xl": "26px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(24, 20, 50, 0.04), 0 10px 30px -12px rgba(24, 20, 50, 0.10)",
        "card-hover": "0 2px 6px rgba(24, 20, 50, 0.06), 0 16px 40px -14px rgba(91, 33, 182, 0.16)",
        soft: "0 1px 2px rgba(24, 20, 50, 0.05)",
      },
    },
  },
  plugins: [],
};
