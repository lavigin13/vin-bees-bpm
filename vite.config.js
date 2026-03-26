import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/VinBeesERP': {
        target: 'https://bpm.bees.vin',
        changeOrigin: true,
        followRedirects: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[proxy error]', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[proxy]', req.method, req.url, '→', proxyReq.path);
          });
        }
      }
    }
  }
})

