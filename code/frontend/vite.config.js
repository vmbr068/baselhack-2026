import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.MCPEX_BACKEND_URL || 'http://localhost:3000',
      '/mock-hotel': process.env.MCPEX_BACKEND_URL || 'http://localhost:3000',
      '/static': process.env.MCPEX_BACKEND_URL || 'http://localhost:3000',
    },
  },
})
