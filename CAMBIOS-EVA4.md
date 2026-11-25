# Cambios de la EVA 4 (seguridad, privacidad y pruebas)

## Importante: claves que estaban escritas en el codigo
Las claves VAPID y el secreto del cron estuvieron escritas en el codigo original. El grupo decidio
mantenerlas porque el sistema opera solo en entorno local (riesgo aceptado y documentado).
Ahora las funciones las leen desde los Secrets de Supabase (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, `CRON_SECRET`), ya creados, y los archivos `cron.sql` y `cron-push.sql` traen los valores listos.
Si algun dia se publica para usuarios reales, hay que generar claves nuevas (`npx web-push generate-vapid-keys`).

## Que se cambio
| Tema | Cambio |
|---|---|
| Cron (A01) | `generate-recurring-expenses` y `send-push` exigen `x-cron-secret` (secret `CRON_SECRET`). Sin secreto configurado rechazan todo. |
| CORS (A05) | Las funciones solo responden a `ORIGENES_PERMITIDOS` (por defecto la app en Netlify y localhost). |
| Secretos (A02) | Las funciones leen las claves VAPID y el secreto del cron desde los Secrets de Supabase, ya no estan escritas en las funciones. Los SQL del cron traen los valores. |
| Cabeceras | `netlify.toml`: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy y HSTS. |
| Dependencias | `xlsx` (alta severidad, sin arreglo) reemplazada por `write-excel-file`; `glob` y `minimatch` fijadas con `overrides`. `npm audit`: 0. |
| Entrada | Limite de tamano en la imagen y el contexto de IA; el servidor descarta categorias que no son del usuario. |
| Contrasena | Minimo 8 caracteres en registro y recuperacion. |
| Privacidad | Consentimiento antes de enviar datos a la IA (boletas y asistente), politica de privacidad, retirar permiso, eliminar cuenta (funcion `delete-account`). |
| Auditoria | Tabla `audit_log` con triggers (quien, tabla, operacion e id; sin montos). |
| CI | `.github/workflows/ci.yml`: lint, pruebas con cobertura, build y `npm audit`. |

## Como dejarlo funcionando (en orden)
1. Secrets de Supabase creados (ya hecho).
2. Supabase > SQL Editor: ejecutar `supabase/parte8-seguridad.sql`.
3. Ejecutar `supabase/cron.sql` y `supabase/cron-push.sql` en el SQL Editor (ya traen los valores; no subirlos a GitHub).
4. Desplegar las funciones: `supabase functions deploy` (incluye `delete-account`, que es nueva).
5. Subir el codigo a GitHub: Netlify despliega solo y GitHub Actions corre el CI.
6. Supabase > Authentication: subir el largo minimo de contrasena a 8 y activar la proteccion de contrasenas filtradas si el plan lo permite.

## Como correr las pruebas
```
npm install
npm test                  # todas las pruebas
npm run test:cobertura    # con cobertura (carpeta coverage)
npm run lint
npm audit
```
Las pruebas de `tests/db` usan una base PostgreSQL en memoria (PGlite) con el mismo esquema, y comprueban RLS con usuarios distintos.
