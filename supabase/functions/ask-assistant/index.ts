// Supabase Edge Function: ask-assistant
//
// Asistente financiero conversacional. Recibe la pregunta del usuario mas
// un resumen compacto de sus datos reales (gastos, categorias, deudas,
// metas) y le pide a Gemini que responda basandose SOLO en esos datos.
//
// Requiere el mismo secret que scan-receipt:
//   supabase secrets set GEMINI_API_KEY=tu-api-key
//
// Deploy: supabase functions deploy ask-assistant

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'gemini-flash-latest';
const MAX_MESSAGES = 20;
const MAX_CONTEXT_BYTES = 200_000;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
      return jsonResponse({ ok: false, error: 'Debes iniciar sesion.' }, 401);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'Falta configurar GEMINI_API_KEY en el proyecto de Supabase.' }, 500);
    }

    const { context, messages } = await req.json();
    if (!context || typeof context !== 'object') {
      return jsonResponse({ ok: false, error: 'Falta el contexto financiero.' }, 400);
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ ok: false, error: 'Falta la pregunta.' }, 400);
    }

    const contextoJSON = JSON.stringify(context);
    if (contextoJSON.length > MAX_CONTEXT_BYTES) {
      return jsonResponse({ ok: false, error: 'Tienes demasiados datos para resumir de una vez. Intenta una pregunta mas acotada.' }, 400);
    }

    // Solo se manda el historial reciente (evita mandar una conversacion
    // eterna cada vez, y limita el costo/tamano del request).
    const historialReciente = messages.slice(-MAX_MESSAGES);
    const contents = historialReciente.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const systemPrompt =
      'Eres el asistente financiero dentro de la app "Mis Finanzas", una app personal de gastos en pesos chilenos (CLP). ' +
      'Responde SOLO basandote en los datos que se te entregan a continuacion, en formato JSON. ' +
      'No inventes montos ni categorias que no esten en los datos. ' +
      'Si no tienes el dato para responder algo, dilo directamente, no adivines. ' +
      'Responde en espanol chileno, corto y directo (2-4 oraciones salvo que pidan un detalle largo), sin markdown ni asteriscos. ' +
      'Los montos van en pesos chilenos, formateados como $12.345 (punto de miles, sin decimales).\n\n' +
      `DATOS DEL USUARIO (JSON):\n${contextoJSON}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.3 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detalle = await geminiRes.text();
      console.error('[ask-assistant] Gemini error:', geminiRes.status, detalle);
      return jsonResponse({ ok: false, error: 'No se pudo consultar al asistente. Intenta de nuevo.' }, 502);
    }

    const data = await geminiRes.json();
    const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!respuesta.trim()) {
      return jsonResponse({ ok: false, error: 'El asistente no pudo responder eso. Intenta reformular la pregunta.' }, 200);
    }

    return jsonResponse({ ok: true, respuesta: respuesta.trim() });
  } catch (err) {
    console.error('[ask-assistant]', err);
    return jsonResponse({ ok: false, error: 'Algo fallo consultando al asistente.' }, 500);
  }
});
