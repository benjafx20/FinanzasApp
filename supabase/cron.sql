-- ============================================================
-- CRON: llamar generate-recurring-expenses todos los días
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de desplegar la
-- Edge Function (supabase functions deploy generate-recurring-expenses).
--
-- Ya trae el ID del proyecto, la clave publicable y el secreto del cron
-- (el mismo valor del secret CRON_SECRET de la funcion). No subir a GitHub.
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('generar-gastos-recurrentes-diario')
where exists (select 1 from cron.job where jobname = 'generar-gastos-recurrentes-diario');

-- Corre todos los días a las 09:00 UTC (~05:00-06:00 hora de Chile,
-- según horario de verano). Cambia '0 9 * * *' si prefieres otra hora.
select cron.schedule(
  'generar-gastos-recurrentes-diario',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://boekkozqphevycbszind.supabase.co/functions/v1/generate-recurring-expenses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_CSrEh9r_Nt_3LUPBxUoTfQ_KBV72Iha',
      'x-cron-secret', 'BUHHsTPFm0zsHnkFf4fY0x-SCWOKDi9b'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar que quedó programado:
-- select * from cron.job where jobname = 'generar-gastos-recurrentes-diario';

-- Para desactivarlo si algo sale mal:
-- select cron.unschedule('generar-gastos-recurrentes-diario');
