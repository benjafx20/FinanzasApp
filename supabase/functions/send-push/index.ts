// Supabase Edge Function: send-push
//
// Dos usos:
//  1) Desde la app (usuario con sesión): { test: true } manda una notificación de
//     prueba a los dispositivos de ese usuario.
//  2) Desde el cron (header x-cron-secret): cada día a las 8:00 de Chile revisa a
//     todos los usuarios con dispositivos suscritos y envía:
//       - los lunes: el resumen de la semana que cerró, y los equipos que llevan
//         15 días o más sin venderse;
//       - el resto de los días: aviso de los equipos que cumplen justo 15 días.
//     { force: true } ignora la hora y se comporta como lunes (para probar).
//
// Las claves ya vienen en el código (ver más abajo): no hace falta cargar secrets.
//
// Deploy: pegar en Edge Functions > send-push (o supabase functions deploy send-push).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UMBRAL_DIAS = 15;

// Claves de las notificaciones, directo en el código (el proyecto es privado). Si
// algún día prefieres no tenerlas aquí, cárgalas como secrets en Supabase con los
// mismos nombres y borra estos valores: los secrets tienen prioridad.
const VAPID_PUBLIC_KEY_POR_DEFECTO = 'BIcJEEXqQyoUX0idjdm1j0z_opl-dXyPGQQeq8P1ZCt9INU2nKbtdZkvvXF1B0Dv2jCYqe1erIyv7E96dohAdBc';
const VAPID_PRIVATE_KEY_POR_DEFECTO = 'WJJsJ69E1AA214BIqviyRRmMW1BSwJ-vbc-8hhSnpwM';
const VAPID_SUBJECT_POR_DEFECTO = 'mailto:admin@example.com'; // opcional: tu correo
const CRON_SECRET_POR_DEFECTO = 'BUHHsTPFm0zsHnkFf4fY0x-SCWOKDi9b';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const peso = (n) => '$' + Math.round(Number(n)).toLocaleString('es-CL');

function ahoraEnChile() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return { hora: Number(valor('hour')), diaSemana: valor('weekday') };
}

// Envía una notificación a todos los dispositivos; borra los que ya no existen.
async function enviar(admin, suscripciones, payload) {
  let enviados = 0;
  for (const s of suscripciones) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      enviados += 1;
    } catch (err) {
      const estado = err?.statusCode;
      if (estado === 404 || estado === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id);
      } else {
        console.error('[send-push] no se pudo enviar:', estado, err?.body || err?.message);
      }
    }
  }
  return enviados;
}

// Semanas que se cerraron en las últimas 36 horas (el cierre corre pasada la
// medianoche del domingo, así que el lunes a las 8:00 ya están los números finales).
async function resumenSemanal(admin, userId) {
  const desde = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const { data: cierres } = await admin
    .from('weekly_plan_closures')
    .select('plan_id, gastado, sobrante_movido, deuda_arrastrada')
    .eq('user_id', userId)
    .gte('semana_num', 1)
    .gte('created_at', desde);
  if (!cierres?.length) return null;

  const { data: planes } = await admin
    .from('weekly_plans')
    .select('id, category_id, monto_semanal, sobrante_category_id')
    .in('id', cierres.map((c) => c.plan_id));
  const ids = [...new Set((planes || []).flatMap((p) => [p.category_id, p.sobrante_category_id].filter(Boolean)))];
  const { data: cats } = ids.length ? await admin.from('categories').select('id, nombre').in('id', ids) : { data: [] };
  const nombre = (id) => cats?.find((c) => c.id === id)?.nombre || 'Categoría';

  const lineas = cierres
    .map((c) => {
      const p = planes?.find((x) => x.id === c.plan_id);
      if (!p) return null;
      let texto = `${nombre(p.category_id)}: gastaste ${peso(c.gastado)} de ${peso(p.monto_semanal)}.`;
      if (Number(c.deuda_arrastrada) > 0) texto += ` Te pasaste por ${peso(c.deuda_arrastrada)}.`;
      else if (Number(c.sobrante_movido) > 0) {
        texto += ` Sobraron ${peso(c.sobrante_movido)}${p.sobrante_category_id ? ' y pasaron a ' + nombre(p.sobrante_category_id) : ''}.`;
      }
      return texto;
    })
    .filter(Boolean);
  if (!lineas.length) return null;
  return { title: 'Resumen de tu semana', body: lineas.join('\n'), tag: 'resumen-semana', url: '/' };
}

async function avisosInventario(admin, userId, esLunes) {
  const { data: filas } = await admin.rpc('inventory_alerts', { p_user: userId });
  const equipos = filas || [];
  const lista = (items) =>
    items
      .slice(0, 5)
      .map((e) => `${e.nombre} (${e.dias} días, ${peso(e.costo)})`)
      .join('\n');
  if (esLunes) {
    const atrasados = equipos.filter((e) => e.dias >= UMBRAL_DIAS);
    if (!atrasados.length) return null;
    return { title: `Equipos sin vender (${atrasados.length})`, body: lista(atrasados), tag: 'inventario', url: '/' };
  }
  const nuevos = equipos.filter((e) => e.dias === UMBRAL_DIAS);
  if (!nuevos.length) return null;
  return { title: 'Equipo sin vender', body: `Ya cumplió ${UMBRAL_DIAS} días:\n${lista(nuevos)}`, tag: 'inventario', url: '/' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const publica = Deno.env.get('VAPID_PUBLIC_KEY') || VAPID_PUBLIC_KEY_POR_DEFECTO;
    const privada = Deno.env.get('VAPID_PRIVATE_KEY') || VAPID_PRIVATE_KEY_POR_DEFECTO;
    if (!publica || !privada) {
      return json({ ok: false, error: 'Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en los secrets de Supabase.' }, 200);
    }
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || VAPID_SUBJECT_POR_DEFECTO, publica, privada);

    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const body = await req.json().catch(() => ({}));
    const secreto = Deno.env.get('CRON_SECRET') || CRON_SECRET_POR_DEFECTO;
    const esCron = !!secreto && req.headers.get('x-cron-secret') === secreto;

    if (!esCron) {
      const cliente = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      });
      const { data: { user } } = await cliente.auth.getUser();
      if (!user) return json({ ok: false, error: 'Debes iniciar sesión.' }, 401);

      const { data: suscripciones } = await admin.from('push_subscriptions').select('*').eq('user_id', user.id);
      if (!suscripciones?.length) {
        return json({ ok: false, error: 'Este dispositivo no está suscrito. Activa las notificaciones primero.' });
      }
      const enviados = await enviar(admin, suscripciones, {
        title: 'Mis Finanzas',
        body: '¡Funciona! Así te llegarán los avisos.',
        tag: 'prueba',
        url: '/',
      });
      return json({ ok: enviados > 0, enviados, error: enviados > 0 ? undefined : 'No se pudo entregar la notificación.' });
    }

    const { hora, diaSemana } = ahoraEnChile();
    if (hora !== 8 && !body.force) return json({ ok: true, omitido: 'No son las 8:00 en Chile', hora });
    const esLunes = diaSemana === 'Mon' || !!body.force;

    const { data: todas } = await admin.from('push_subscriptions').select('*');
    const porUsuario = new Map();
    for (const s of todas || []) porUsuario.set(s.user_id, [...(porUsuario.get(s.user_id) || []), s]);

    let usuarios = 0;
    let enviados = 0;
    for (const [userId, suscripciones] of porUsuario) {
      const avisos = [];
      if (esLunes) {
        const resumen = await resumenSemanal(admin, userId);
        if (resumen) avisos.push(resumen);
      }
      const inventario = await avisosInventario(admin, userId, esLunes);
      if (inventario) avisos.push(inventario);
      for (const aviso of avisos) enviados += await enviar(admin, suscripciones, aviso);
      usuarios += 1;
    }
    return json({ ok: true, usuarios, enviados, esLunes });
  } catch (err) {
    console.error('[send-push]', err);
    return json({ ok: false, error: 'Algo falló enviando las notificaciones.' }, 500);
  }
});
