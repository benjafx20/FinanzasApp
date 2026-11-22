# Resumen de "Mis Finanzas" (para continuar en otro chat)

## Qué es
App personal de finanzas de Benja (Chile). PWA hecha con React + Vite. Datos en Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron). Se publica en Netlify (hay `netlify.toml`) y el repo en GitHub es privado. Se usa en iPhone, instalada en la pantalla de inicio (iOS 27).

## Cómo está armado
- `src/pages/Dashboard.jsx`: pantalla principal (más de 1.400 líneas, conviene partirla).
- `src/hooks/`: un hook por tabla (useExpenses, useIncomes, useCategoryFundings, useBudgetTransfers, useSavingsGoals, useDebts, useRecurringExpenses, useCategories, useWeeklyPlans, useMerchantHabits, useInventoryStatus...).
- `src/utils/`: lógica pura con pruebas (balances.js, weeklyPlan.js, monthlySummary.js, inventory.js, shortfall.js, debtMovements.js, goalAdjust.js, incomeAdjust.js, exportData.js, habits.js, dialogs.js, toasts.js...).
- `supabase/`: `EJECUTAR-EN-SUPABASE.sql` (todo el SQL, se puede correr varias veces), Edge Functions (`scan-receipt`, `send-push`, `generate-recurring-expenses`, `ask-assistant`) y `cron-push.sql`.
- Comandos: `npm install`, `npm run dev`, `npm test` (Vitest, con jsdom y Testing Library para probar pantallas), `npm run build`, `npx oxlint src`.

## Cómo se calcula la plata
Cada categoría es una billetera. Saldo = aportes (ingresos repartidos + "Agregar plata") + traspasos recibidos − traspasos enviados − gastos (salen de `funding_category_id` o de la propia categoría) − aportes a metas (`source_category_id`) ± deudas que movieron plata (si se eligió categoría). Está en `src/utils/balances.js`.

## Funciones que ya tiene
- Gastos, ingresos, traspasos, categorías, gastos recurrentes (cron), deudas y préstamos, metas de ahorro.
- Escaneo de boletas con Gemini (cámara o galería): lee monto, fecha, comercio y sugiere categoría. Foto guardada como comprobante. Aprende la categoría de cada comercio (tu hábito gana sobre la IA).
- Grupos "agrupar como" en gastos e ingresos; cambiar el nombre de un grupo en todo; ganancia por grupo.
- Presupuesto semanal por categoría (lunes a domingo): el disponible nunca supera el saldo real, cierre automático el domingo en la noche (cron), sobrante a otra categoría, deuda arrastrada, editable.
- Si una categoría no alcanza (gasto, presupuesto, aporte a meta, préstamo): avisa y pregunta de qué otra categoría sacar lo que falta (queda como movimiento). También permite continuar en negativo.
- Metas de ahorro: aportes salen de una categoría, se editan nombre, objetivo, fecha y cantidad ahorrada; ver, corregir y deshacer aportes; cerrar meta ("ya usé la plata" + en qué se gastó); compras con ahorro aparecen aparte en el resumen mensual.
- Resumen mensual de cierre con comparación por categoría contra el mes anterior (se abre solo una vez, el del mes recién cerrado).
- Inventario de celulares (categoría marcada como inventario): equipos sin vender con costo y días, aviso a los 15 días, botón "Vendido", marcar "para repuestos" o "dado por pérdida", las sugerencias de grupo solo ofrecen equipos sin vender.
- Excel de respaldo (engranaje, Ajustes). Notificaciones push (resumen de la semana el lunes 8:00 y equipos sin vender).
- Aviso "Deshacer" al borrar gasto, aporte, ingreso, deuda, meta, movimiento o gasto recurrente.
- Detalle de categoría con secciones plegables; movimientos entre categorías limitados a 5 sin los automáticos.
- Listas sin tope de 1.000 filas (paginadas).
- **Sin conexión**: gastos, ingresos, aportes a categorías (incluido el reparto de un ingreso) y aportes a metas se guardan en el celular y se suben solos al volver la señal (`utils/offlineOps.js`, `utils/syncPendingOps.js`, `hooks/usePendingSync.js`). Cada uno lleva un id creado en el celular, así que repetir una subida nunca duplica. Mientras esperan se ven marcados "Sin sincronizar" y ya cuentan en los saldos; no se pueden editar ni borrar hasta que suban. Un aviso arriba cuenta lo pendiente; si el servidor rechaza algo 5 veces queda "fallido" y se puede descartar desde el aviso. Necesitan conexión: traspasos, deudas, metas nuevas, editar y borrar.
- **Bloqueo con PIN** (Ajustes > Bloqueo con PIN): 4 dígitos, solo un hash SHA-256 con sal en este dispositivo (`utils/pinLock.js`, `components/lock/`). Se pide al abrir la app y al volver tras 60 s o más en segundo plano, no justo después de escribir correo y contraseña. 5 errores = espera de 30 s. "Olvidé mi PIN" cierra la sesión en este dispositivo (sin necesitar conexión) y quita el PIN; lo pendiente de subir no se pierde.

## Cómo se despliega
1. Reemplazar `src`, `public`, `supabase`, `package.json`, `package-lock.json`, `vite.config.js` en el proyecto; `npm install`; subir a GitHub.
2. Pegar `supabase/EJECUTAR-EN-SUPABASE.sql` completo en el SQL Editor y Run.
3. Edge Functions desde el panel (Via Editor): `scan-receipt` y `send-push` (en `send-push` apagar "Verify JWT"). Las claves de notificaciones van dentro del código.
4. Pegar `supabase/cron-push.sql` en el SQL Editor.

## Pendiente
1. Ver qué más aparece usando la app.
2. Ideas guardadas (ninguna pedida todavía): aviso antes de un gasto recurrente, aviso de deudas antiguas, metas con "cuánto ahorrar al mes", gasto por voz o texto, importar cartola del banco, respaldo automático, partir `Dashboard.jsx`, reporte de errores, ver datos ya cargados al abrir la app sin señal (hoy hay que abrirla una vez con señal).

## Ojo
- Nada de lo entregado se probó en un celular real. Sí se probó con pruebas automáticas: la lógica, los hooks reales contra un servidor falso (se va la señal, se registra, vuelve, se sube sin duplicar) y el Dashboard completo montado en un navegador simulado (jsdom). Las notificaciones push son lo más riesgoso (requieren la función desplegada, el cron y permiso en el iPhone).
- El entorno de trabajo del asistente se reinicia: siempre partir del último `finanzas-app.zip` y correr `npm install`.

## Cómo trabajar con Benja
- Español. Prefiere pasos claros y numerados, qué ejecutar en Supabase por cada cambio, y el código corto o el SQL pegado en el chat. Los proyectos completos, en un zip.
- Cuando pide "por partes", preguntar lo necesario antes de construir y entregar todo junto al final.
- Dicta mensajes por voz, así que a veces llegan con errores: confirmar si algo es ambiguo.
