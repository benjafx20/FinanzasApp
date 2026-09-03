// Supabase Edge Function: scan-receipt
//
// Recibe la foto de una boleta (base64) y le pide a Gemini que lea SOLO
// el monto total y la fecha — nada de categoría, esa la elige el usuario
// con un tap en la app (mucho más simple y siempre correcto que adivinar).
//
// Requiere un secret con la API key de Gemini (Google AI Studio):
//   supabase secrets set GEMINI_API_KEY=tu-api-key
// (se consigue en https://aistudio.google.com/apikey)
//
// Deploy: supabase functions deploy scan-receipt
// Prueba manual: supabase functions invoke scan-receipt --data '{"image":"...","mediaType":"image/jpeg"}'

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

// Por si acaso el modelo igual envuelve el JSON en ```json ... ``` (no
// debería, porque se le pide responseMimeType "application/json", pero
// esto lo deja limpio antes de parsear igual).
function extraerJSON(texto) {
  const limpio = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpio);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verifica que quien llama sea un usuario real y autenticado de la
    // app (no cualquiera pegándole a la función y gastando la API key).
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

    const { image, mediaType } = await req.json();
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
      return jsonResponse({ ok: false, error: 'No se pudo leer la boleta. Intenta de nuevo o ingrésalo a mano.' }, 502);
    }

    const data = await geminiRes.json();
    const textoRespuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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

    if (monto === null && fecha === null) {
      return jsonResponse({ ok: false, error: 'No logramos leer el monto ni la fecha. Ingrésalo a mano.' }, 200);
    }

    return jsonResponse({ ok: true, monto, fecha });
  } catch (err) {
    console.error('[scan-receipt]', err);
    return jsonResponse({ ok: false, error: 'Algo falló leyendo la boleta. Ingrésalo a mano.' }, 500);
  }
});
