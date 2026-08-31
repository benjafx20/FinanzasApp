import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Sin esto, un service worker viejo puede quedarse activo en el
        // celular del usuario hasta que cierre TODAS las pestañas/la app
        // manualmente. Con esto, la versión nueva toma control apenas
        // termina de descargarse, sin pasos manuales.
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Mis Finanzas',
        short_name: 'Finanzas',
        description: 'Organiza tus gastos semanales y mensuales',
        theme_color: '#6B3FD9',
        background_color: '#EDE4FB',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
