import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Chrome >= 49', 'Firefox >= 52', 'Safari >= 10'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: true
    })
  ],
  server: {
    port: Number(process.env.PORT) || 5173
  },
  build: {
    target: 'es2015',
    cssTarget: 'chrome61'
  }
})
