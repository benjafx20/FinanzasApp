// Supabase Edge Function: delete-account
//
// Borra la cuenta de quien la llama: sus fotos de boletas, todos sus datos
// (las tablas se borran en cascada al eliminar el usuario) y su usuario de
// acceso. Es el derecho a eliminacion de la Ley 21.719.
//
// Deploy: supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORIGENES_PERMITIDOS = (
  Deno.env.get('ORIGENES_PERMITIDOS') ?? 'https://finanzascrack.netlify.app,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function cabecerasCors(req) {
  const origen = req.headers.get('Origin') ?? '';
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  return ORIGENES_PERMITIDOS.includes(origen) ? { ...base, 'Access-Control-Allow-Origin': origen } : base;
}

Deno.serve(async (req) => {
  const cors = cabecerasCors(req);
  const responder = (cuerpo, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder({ ok: false, error: 'Metodo no permitido.' }, 405);

  try {
    const cliente = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
      error: errorAuth,
    } = await cliente.auth.getUser();
    if (errorAuth || !user) return responder({ ok: false, error: 'Debes iniciar sesion.' }, 401);

    const { confirmar } = await req.json().catch(() => ({}));
    if (confirmar !== 'ELIMINAR') return responder({ ok: false, error: 'Falta la confirmacion.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Fotos de boletas: carpeta con el id del usuario.
    const { data: archivos } = await admin.storage.from('receipts').list(user.id, { limit: 1000 });
    if (archivos?.length) {
      const rutas = archivos.map((a) => `${user.id}/${a.name}`);
      const { error: errorFotos } = await admin.storage.from('receipts').remove(rutas);
      if (errorFotos) throw errorFotos;
    }

    const { error: errorBorrar } = await admin.auth.admin.deleteUser(user.id);
    if (errorBorrar) throw errorBorrar;

    return responder({ ok: true });
  } catch (err) {
    console.error('[delete-account]', err);
    return responder({ ok: false, error: 'No se pudo eliminar la cuenta. Intenta de nuevo.' }, 500);
  }
});
