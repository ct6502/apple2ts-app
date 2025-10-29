import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'fs', 'fs/promises'],
      output: {
        format: 'cjs' // CommonJS format for preload scripts
      }
    }
  }
})
