import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const surface = process.env.PANEL_SURFACE === "desktop" ? "desktop" : "mobile";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    outDir: "public/assets/framework",
    emptyOutDir: false,
    lib: {
      entry: resolve(rootDir, `src/panel-framework/${surface}/main.tsx`),
      name: surface === "desktop" ? "PanelDesktop" : "PanelMobile",
      formats: ["iife"],
      fileName: () => `panel-${surface}.js`,
      cssFileName: surface,
    }
  }
});
