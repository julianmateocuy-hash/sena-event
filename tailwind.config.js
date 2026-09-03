/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidad: verde institucional SENA reinterpretado como acento tecnológico
        // sobre una base casi-negra con tinte verdoso (no gris neutro, no negro puro).
        base: {
          950: "#06110C", // fondo principal
          900: "#0B1B13",
          800: "#122B1D",
          700: "#1B3F29",
        },
        signal: {
          DEFAULT: "#39D98A", // acento primario — validación / entrada
          dim: "#1F8F5C",
          amber: "#E8B339",  // estados de espera / salida
          red: "#E85D4A",    // rechazo / error
        },
        paper: "#EFF5EF",   // texto principal sobre fondo oscuro
        mist: "#9FB3A6",    // texto secundario
      },
      fontFamily: {
        display: ["'Manrope'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 20px 60px -20px rgba(0,0,0,0.6)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        driftIn: {
          "0%": { opacity: 0, transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        scanline: "scanline 1.6s ease-in-out infinite",
        driftIn: "driftIn 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
