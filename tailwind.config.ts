import type { Config } from "tailwindcss";

const config: Config = {
  // Tema claro fijo para el MVP: con "class" (en vez del default "media"),
  // cualquier clase "dark:" que se agregue luego por descuido no responde a
  // prefers-color-scheme del sistema — necesitaría una clase .dark explícita
  // que nada en la app agrega todavía.
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
