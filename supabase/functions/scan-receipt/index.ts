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

// Alias mantenido por Google que apunta al Flash más reciente.
const MODEL = 'gemini-flash-latest';
const MAX_IMAGE_BYTES = 6_000_000;
const MAX_CATEGORIAS = 80;

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

async function llamarGemini(apiKey, body) {
  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }
  );
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

    // Solo categorías con forma válida; el modelo elige por id y después se
    // verifica que ese id exista en esta lista.
    const lista = (Array.isArray(categorias) ? categorias : [])
      .filter((c) => c && typeof c.id === 'string' && typeof c.nombre === 'string')
      .slice(0, MAX_CATEGORIAS)
      .map((c) => ({ id: c.id, nombre: c.nombre.trim().slice(0, 40) }));
    const idsValidos = new Set(lista.map((c) => c.id));

    // Fecha de hoy en Chile, por si la boleta trae la fecha abreviada o sin año.
    const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

    const instrucciones =
      `Eres un lector de boletas y recibos de Chile. Analiza la imagen y responde SOLO con este JSON, sin nada más:\n` +
      `{"monto": <número>, "fecha": "<YYYY-MM-DD>", "comercio": "<texto>", "categoria_id": "<id de la lista>"}\n\n` +
      `Reglas:\n` +
      `- monto: el TOTAL final que se pagó, como entero en pesos chilenos, sin puntos ni signo. En Chile el punto separa miles ("12.990" es 12990). ` +
      `No uses subtotal, neto, IVA, descuentos, vuelto, ni el efectivo entregado. Si hay propina y quedó incluida en el total pagado, el monto es ese total.\n` +
      `- fecha: en Chile se escribe día/mes/año (ej. 05/10/2026 es el 5 de octubre de 2026). Conviértela a YYYY-MM-DD. ` +
      `Si el año viene con 2 dígitos, usa 20xx. Hoy es ${hoyISO}.\n` +
      `- comercio: nombre del local o marca (ej. "Copec", "Jumbo"), corto, sin dirección ni RUT.\n` +
      `- categoria_id: de la siguiente lista elige el id de la categoría que mejor calce según el comercio y lo comprado ` +
      `(por ejemplo, una estación de servicio con combustible va a una categoría de transporte o bencina si existe). ` +
      `Si ninguna calza con claridad, pon null. Nunca inventes un id que no esté en la lista.\n` +
      `- Si no logras leer algún dato con confianza, ponlo en null. No inventes valores.\n\n` +
      `Categorías (id | nombre):\n` +
      (lista.length ? lista.map((c) => `${c.id} | ${c.nombre}`).join('\n') : '(sin categorías)');

    const baseBody = {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: tipoImagen, data: image } },
            { text: instrucciones },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    };

    // Primero sin "pensar" (más rápido para una lectura simple). Si el modelo
    // no acepta esa opción (400), se repite igual que antes.
    let geminiRes = await llamarGemini(apiKey, {
      ...baseBody,
      generationConfig: { ...baseBody.generationConfig, thinkingConfig: { thinkingBudget: 0 } },
    });
    if (geminiRes.status === 400) {
      geminiRes = await llamarGemini(apiKey, baseBody);
    }

    if (!geminiRes.ok) {
      const detalle = await geminiRes.text();
      console.error('[scan-receipt] Gemini error:', geminiRes.status, detalle);
      return jsonResponse({ ok: false, error: 'No se pudo leer la boleta. Intenta de nuevo o ingrésalo a mano.' }, 502);
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
