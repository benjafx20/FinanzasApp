-- ============================================================
-- CRON: llamar generate-recurring-expenses todos los días
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de desplegar la
-- Edge Function (supabase functions deploy generate-recurring-expenses).
--
-- Antes de ejecutar, reemplaza:
--   TU-PROYECTO   -> el ID de tu proyecto (lo ves en la URL del panel,
--                     o en Settings > API como parte del Project URL)
--   TU-ANON-KEY   -> tu clave "anon public" (Settings > API)
-- ============================================================
-- Proyecto actual configurado: boekkozqphevycbszind

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
      'Authorization', 'Bearer sb_publishable_CSrEh9r_Nt_3LUPBxUoTfQ_KBV72Iha'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para revisar que quedó programado:
-- select * from cron.job where jobname = 'generar-gastos-recurrentes-diario';

-- Para desactivarlo si algo sale mal:
-- select cron.unschedule('generar-gastos-recurrentes-diario');
