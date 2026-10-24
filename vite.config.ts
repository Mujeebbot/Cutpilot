import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'esnext' },
  // The Whisper worker uses dynamic import, which needs ES-module worker output.
  worker: { format: 'es' },
})
