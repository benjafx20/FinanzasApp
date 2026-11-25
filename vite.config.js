import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'

// Las cabeceras de seguridad viven en netlify.toml. Para que "npm run preview"
// (prueba local) responda igual que Netlify, se leen de ahi.
function cabecerasDeNetlify() {
  try {
    const toml = fs.readFileSync(new URL('./netlify.toml', import.meta.url), 'utf8');
    const bloque = toml.split('[[headers]]').find((b) => b.includes('for = "/*"')) || '';
    const cabeceras = {};
    for (const m of bloque.matchAll(/^\s*([A-Za-z-]+) = "(.*)"\s*$/gm)) cabeceras[m[1]] = m[2];
    delete cabeceras.for;
    return cabeceras;
  } catch {
    return {};
  }
}

// https://vite.dev/config/
export default defineConfig({
  preview: { headers: cabecerasDeNetlify() },
  test: {
    env: {
      VITE_SUPABASE_URL: 'https://proyecto-de-prueba.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'clave-de-prueba',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/main.jsx'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
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
        // Notificaciones push: un archivo aparte que el service worker importa.
        importScripts: ['push-sw.js'],
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
