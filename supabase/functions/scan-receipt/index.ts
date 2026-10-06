// Supabase Edge Function: scan-receipt
//
// Recibe la foto de una boleta (base64) y la lista de categorías del usuario,
// y le pide a Gemini que lea: monto total, fecha, nombre del comercio y cuál
// de las categorías del usuario calza mejor (o ninguna si no está seguro).
// La app muestra el resultado para que el usuario lo confirme o lo edite.
//
// Requiere un secret con la API key de Gemini (Google AI Studio):
//   supabase secrets set GEMINI_API_KEY=tu-api-key
//
// Deploy: supabase functions deploy scan-receipt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Alias mantenido por Google que siempre apunta al Flash más reciente —
// así no hay que andar actualizando el nombre del modelo a mano cada vez
// que Google saca una versión nueva.
const MODEL = 'gemini-flash-latest';
const MAX_IMAGE_BYTES = 6_000_000; // ~6MB en base64, de sobra para una foto comprimida en el celular

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extraerJSON(texto) {
  const limpio = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpio);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ ok: false, error: 'Debes iniciar sesión.' }, 401);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'Falta configurar GEMINI_API_KEY en el proyecto de Supabase.' }, 500);
    }

    const { image, mediaType, categorias } = await req.json();
    if (!image || typeof image !== 'string') {
      return jsonResponse({ ok: false, error: 'No llegó ninguna imagen.' }, 400);
    }
    if (image.length > MAX_IMAGE_BYTES) {
      return jsonResponse({ ok: false, error: 'La foto es muy pesada. Prueba con otra o achícala.' }, 400);
    }
    const tipoImagen = ['image/jpeg', 'image/png', 'image/webp'].includes(mediaType) ? mediaType : 'image/jpeg';

    const hoyISO = new Date().toISOString().slice(0, 10);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: tipoImagen, data: image } },
                {
                  text:
                    `Lees boletas y recibos chilenos. Mira esta boleta y responde SOLO con este JSON, sin nada más:\n` +
                    `{"monto": <monto TOTAL pagado, entero en pesos chilenos, sin puntos ni signo $>, "fecha": "<fecha en formato YYYY-MM-DD>"}\n` +
                    `Si no logras leer el monto con confianza, pon "monto": null. ` +
                    `Si no logras leer la fecha, pon "fecha": null (no inventes una fecha). ` +
                    `Hoy es ${hoyISO}, por si la fecha de la boleta viene abreviada o sin año.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detalle = await geminiRes.text();
      console.error('[scan-receipt] Gemini error:', geminiRes.status, detalle);
      const saturado = geminiRes.status === 429 || geminiRes.status >= 500;
      return jsonResponse({
        ok: false,
        error: saturado
          ? 'Google está con mucha demanda ahora. Espera unos segundos y vuelve a escanear.'
          : 'No se pudo leer la boleta. Intenta de nuevo o ingrésalo a mano.',
      }, 200);
    }

    const data = await geminiRes.json();
    const partes = data?.candidates?.[0]?.content?.parts ?? [];
    const textoRespuesta = partes.map((p) => p.text ?? '').join('');

    let extraido;
    try {
      extraido = extraerJSON(textoRespuesta);
    } catch {
      console.error('[scan-receipt] No se pudo parsear la respuesta:', textoRespuesta);
      return jsonResponse({ ok: false, error: 'No logramos leer la boleta con claridad. Ingrésalo a mano.' }, 200);
    }

    const monto = Number.isFinite(Number(extraido.monto)) && Number(extraido.monto) > 0
      ? Math.round(Number(extraido.monto))
      : null;
    const fecha = typeof extraido.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(extraido.fecha)
      ? extraido.fecha
      : null;
    const comercio = typeof extraido.comercio === 'string' && extraido.comercio.trim()
      ? extraido.comercio.trim().slice(0, 60)
      : null;
    const categoriaId = typeof extraido.categoria_id === 'string' && idsValidos.has(extraido.categoria_id)
      ? extraido.categoria_id
      : null;

    if (monto === null && fecha === null) {
      return jsonResponse({ ok: false, error: 'No logramos leer el monto ni la fecha. Ingrésalo a mano.' }, 200);
    }

    return jsonResponse({ ok: true, monto, fecha, comercio, categoriaId });
  } catch (err) {
    console.error('[scan-receipt]', err);
    return jsonResponse({ ok: false, error: 'Algo falló leyendo la boleta. Ingrésalo a mano.' }, 500);
  }
});
