# Activar las notificaciones

Las claves ya están dentro del código, así que no hay que cargar secrets ni variables.

## 1. SQL
Pega `supabase/EJECUTAR-EN-SUPABASE.sql` completo en el SQL Editor y presiona Run.

## 2. Crear la función
Supabase, **Edge Functions**, botón **Deploy a new function** (elige "Via Editor"). Nombre: `send-push`.
Borra todo lo que traiga el editor, pega el contenido de `supabase/functions/send-push/index.ts` y presiona **Deploy**.

## 3. Programar el envío diario
Pega `supabase/cron-push.sql` completo en el SQL Editor y presiona Run (ya trae los datos de tu proyecto).

## Probar en el iPhone
1. Abre la app desde el ícono de la pantalla de inicio (no desde Safari).
2. Engranaje (Ajustes), **Activar notificaciones**, acepta el permiso.
3. **Enviarme una notificación de prueba**: debe llegar en unos segundos.
