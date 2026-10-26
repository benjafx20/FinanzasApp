// Notificaciones push. Lo carga el service worker de la PWA (ver vite.config.js).
// Va en un archivo aparte para no tocar el cache ni las actualizaciones de la app.
self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { body: event.data ? event.data.text() : '' };
  }
  const titulo = datos.title || 'Mis Finanzas';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: datos.tag,
      data: { url: datos.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) return ventana.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
