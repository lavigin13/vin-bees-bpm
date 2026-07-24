import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bee-avatar.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'VinBees — портал працівника',
        short_name: 'VinBees',
        description: 'Портал працівника VinBees',
        lang: 'uk',
        theme_color: '#121214',
        background_color: '#121214',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Game artwork (assets/*.webp) is deliberately NOT precached — it's
        // ~1MB that most employees never need. It's cached on first use below.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [
          /^\/Planner(\/|$)/i,
          /^\/ExpenseReport(\/|$)/i,
          /^\/Profile(\/|$)/i,
          /^\/VinBeesERP(\/|$)/i,
          /^\/VinBeesBUH(\/|$)/i,
          /^\/VinBeesTelegram(\/|$)/i,
          /^\/TEST(\/|$)/i,
          /^\/Repository(\/|$)/i,
          /^\/aspnet_client(\/|$)/i,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.statusCode === 401 && proxyRes.headers['www-authenticate']) {
              proxyRes.headers['x-www-authenticate'] = proxyRes.headers['www-authenticate'];
              delete proxyRes.headers['www-authenticate'];
            }
          });
        }
      }
    }
  }
})

