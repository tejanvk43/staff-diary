import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// LAN Configuration:
// Replace VITE_API_URL in .env with your server's LAN IP, e.g. http://192.168.1.10:5000
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 3000,
    strictPort: false,   // auto-increment if port busy
  },
})
