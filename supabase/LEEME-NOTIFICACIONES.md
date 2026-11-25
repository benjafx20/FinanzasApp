# Activar las notificaciones y proteger las funciones

Las claves ya NO van dentro del codigo: se cargan como secrets en Supabase.

## 1. Crear las claves nuevas
1. Clave VAPID (para las notificaciones). En tu PC: `npx web-push generate-vapid-keys`. Te da una clave publica y una privada.
2. Secreto del cron: una clave larga al azar. En tu PC: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 2. Cargarlas como secrets
Supabase > Edge Functions > Secrets (o con `supabase secrets set NOMBRE=valor`). Crea estos:
- `VAPID_PUBLIC_KEY` (la publica)
- `VAPID_PRIVATE_KEY` (la privada)
- `VAPID_SUBJECT` (por ejemplo `mailto:tucorreo@gmail.com`)
- `CRON_SECRET` (el secreto del paso 1.2)
- `ORIGENES_PERMITIDOS` (opcional; por defecto `https://finanzascrack.netlify.app,http://localhost:5173`)

La clave publica VAPID tambien va en Netlify como variable `VITE_VAPID_PUBLIC_KEY` (o se cambia en `src/utils/push.js`).
Si cambias las claves VAPID, cada dispositivo tiene que volver a activar las notificaciones en Ajustes.

## 3. SQL
Pega `supabase/EJECUTAR-EN-SUPABASE.sql` completo en el SQL Editor y presiona Run.

## 4. Crear o actualizar las funciones
Supabase, **Edge Functions**, **Deploy a new function** (Via Editor). Pega el contenido de cada archivo:
`send-push`, `generate-recurring-expenses`, `scan-receipt`, `ask-assistant` y `delete-account`.
En `send-push` y `generate-recurring-expenses` apaga "Verify JWT" (las protege el secreto del cron). En las demas, dejalo encendido.

## 5. Programar los envios
Pega `supabase/cron-push.sql` y `supabase/cron.sql` en el SQL Editor (ya traen los valores) y presiona Run.

## Probar en el iPhone
1. Abre la app desde el icono de la pantalla de inicio (no desde Safari).
2. Engranaje (Ajustes), **Activar notificaciones**, acepta el permiso.
3. **Enviarme una notificacion de prueba**: debe llegar en unos segundos.
