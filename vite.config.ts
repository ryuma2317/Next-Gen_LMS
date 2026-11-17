import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  // Custom environment variables are never injected into the browser bundle.
  envPrefix: [],
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    host: '127.0.0.1',
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/.dev.vars*', '**/Trainee Orientation Day.pdf', '**/tmp/**', '**/private-data/**', '**/backups/**', '**/exports/**'] },
  },
})
