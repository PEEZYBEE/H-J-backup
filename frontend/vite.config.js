import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const HMR_HOST = process.env.VITE_HMR_HOST
const HMR_PROTOCOL = process.env.VITE_HMR_PROTOCOL || 'wss'
const HMR_CLIENT_PORT = Number(process.env.VITE_HMR_CLIENT_PORT || 443)
const PUBLIC_TUNNEL_HOST = process.env.VITE_PUBLIC_TUNNEL_HOST

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    port: 5173,
    host: '127.0.0.1', // Use 127.0.0.1 to match Google OAuth authorized origins
    allowedHosts: [
      '.ngrok-free.dev', // Allow all ngrok-free.dev subdomains
      ...(PUBLIC_TUNNEL_HOST ? [PUBLIC_TUNNEL_HOST] : [])
    ],
    hmr: HMR_HOST
      ? {
          host: HMR_HOST,
          protocol: HMR_PROTOCOL,
          clientPort: HMR_CLIENT_PORT,
        }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})