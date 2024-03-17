import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  base: "/squad-bot/",
  // https://stackoverflow.com/a/69743888
  ...process.env.ENABLE_TEST_HTTPS === 'true' && {
    server: {
      https: {
        key: fs.readFileSync('./.cert/key.pem'),
        cert: fs.readFileSync('./.cert/cert.pem'),
      },
    }
  },
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
