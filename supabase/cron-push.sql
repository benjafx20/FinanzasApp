-- ============================================================
-- CRON: avisos push (resumen semanal y equipos sin vender)
-- Ejecutar en el SQL Editor DESPUÉS de desplegar la función send-push.
-- Ya viene con los datos de tu proyecto: solo pégalo y córrelo.
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('push-avisos-8am')
where exists (select 1 from cron.job where jobname = 'push-avisos-8am');

-- Corre a las 11:00 y a las 12:00 UTC: una de las dos es las 8:00 en Chile (según
-- horario de verano o de invierno). La función solo actúa cuando en Chile son las 8.
select cron.schedule(
  'push-avisos-8am',
  '0 11,12 * * *',
  $$
  select net.http_post(
    url := 'https://boekkozqphevycbszind.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_CSrEh9r_Nt_3LUPBxUoTfQ_KBV72Iha',
      'x-cron-secret', 'BUHHsTPFm0zsHnkFf4fY0x-SCWOKDi9b'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar: select * from cron.job where jobname = 'push-avisos-8am';
-- Para desactivarlo: select cron.unschedule('push-avisos-8am');
