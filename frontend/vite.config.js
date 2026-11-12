
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/odoo-api': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/odoo-api/, ''),
      },
    },
  },
})
