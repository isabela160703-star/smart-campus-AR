import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages el sitio se sirve bajo /<repo>/, por lo que las rutas de
// assets deben llevar ese prefijo. En local/Docker (y en el túnel HTTPS) el
// build se sirve en la raíz, así que el base es '/'. El workflow de Actions
// define GH_PAGES_BASE para inyectar el subpath correcto en CI.
const base = process.env.GH_PAGES_BASE || '/';

// HTTPS con certificado autofirmado: los smartphones en la red local solo
// conceden acceso a cámara, micrófono y giroscopio en contextos seguros (HTTPS).
export default defineConfig({
  base,
  plugins: [
    react(),
    basicSsl(),
    // PWA instalable: manifest, iconos y service worker (offline)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        id: './',
        name: 'SmartCampus AR - Guía Multimodal de Laboratorios',
        short_name: 'SmartCampus',
        description: 'Guía multimodal de laboratorios con realidad aumentada y sensores del teléfono',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#000000',
        background_color: '#000000',
        orientation: 'portrait',
        lang: 'es',
        categories: ['education', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html'
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    watch: {
      usePolling: true
    }
  }
});
