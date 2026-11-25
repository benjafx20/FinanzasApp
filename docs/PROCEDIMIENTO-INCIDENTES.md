# Procedimiento de respuesta a incidentes de seguridad

Aplica a cualquier hecho que afecte la confidencialidad, integridad o disponibilidad de los datos de la aplicacion
(acceso no autorizado, fuga de claves, perdida de datos, caida prolongada del servicio).

| Fase | Que se hace | Responsable |
|---|---|---|
| 1. Deteccion | Alerta de Supabase o Netlify, aviso de un usuario, revision del registro de auditoria (`audit_log`) o hallazgo de las pruebas. | Quien lo detecte avisa al grupo de inmediato |
| 2. Contencion | Cambiar las claves comprometidas (secrets de Supabase, `CRON_SECRET`, claves VAPID), cerrar sesiones y, si hace falta, pausar las funciones afectadas. | Integrante a cargo del backend |
| 3. Evaluacion | Determinar que datos y que usuarios se vieron afectados, desde cuando y por que via. Consultar `audit_log` (usuario, tabla, operacion y fecha). | Todo el grupo |
| 4. Notificacion | Avisar por correo a los usuarios afectados indicando que ocurrio, que datos y que deben hacer (compromiso de la politica de privacidad). Si corresponde, informar a la autoridad de proteccion de datos segun la Ley 21.719. | Jefe de grupo |
| 5. Recuperacion | Corregir la causa, desplegar, volver a ejecutar las pruebas y el escaneo de seguridad y confirmar que el servicio funciona. | Integrante a cargo del backend |
| 6. Cierre | Dejar por escrito la causa, el impacto, lo que se hizo y que cambia para que no se repita. | Todo el grupo |
