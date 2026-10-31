import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.MCPEX_BACKEND_URL || 'https://api.bh2026.tekitup.net'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backendUrl,
      '/mock-hotel': backendUrl,
      '/static': backendUrl,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@react-spectrum/s2/')) return 'spectrum2'
        },
      },
    },
  },
})
