import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    emptyOutDir: true,
    outDir: "dist",
    reportCompressedSize: true,
    rolldownOptions: {
      external: ["expo-sqlite"],
    },
  },
  cacheDir: "../../node_modules/.vite/applications/lexico",
  css: {
    devSourcemap: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // React plugin must come after TanStack Start plugin
    react(),
  ],
  preview: {
    host: "localhost",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(
        import.meta.dirname,
        "../../packages/lexico-components/src",
      ),
    },
    tsconfigPaths: true,
  },
  root: import.meta.dirname,
  server: {
    host: "localhost",
    port: 3000,
  },
});
