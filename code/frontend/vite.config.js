import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl =
    env.MCPEX_BACKEND_URL ||
    process.env.MCPEX_BACKEND_URL ||
    'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/mock-hotel': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/static': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
