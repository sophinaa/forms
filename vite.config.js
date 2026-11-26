import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // `npm run dev:ui` (hot reload) sends API calls to the Node server on :3000.
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
