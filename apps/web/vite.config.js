import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,  // Enable PWA in development
        type: 'module',
        navigateFallback: 'index.html',
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-192x192-maskable.png',
        'pwa-512x512-maskable.png'
      ],
      manifest: {
        name: 'TrackFlow - Courier Tracking Platform',
        short_name: 'TrackFlow',
        description: 'TrackFlow multi-tenant courier operations platform',
        theme_color: '#F74B25',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:5000\/api\/.*\/shipments/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'shipments-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          },
          {
            urlPattern: /^http:\/\/localhost:5000\/api\/track/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tracking-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 600 }
            }
          }
        ]
      }
    })
  ],
  server: { 
    port: 5173,
    host: true,  // Listen on all interfaces
    proxy: { 
      '/api': { 
        target: 'http://localhost:5000', 
        changeOrigin: true 
      } 
    } 
  }
});

