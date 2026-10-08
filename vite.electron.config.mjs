import path from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    ssr: true,
    outDir: ".vite/build",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve("src/main.ts"),
        preload: path.resolve("src/preload.ts")
      },
      external: ["electron", "electron-updater"],
      output: {
        format: "cjs",
        entryFileNames: "[name].js"
      }
    }
  }
})