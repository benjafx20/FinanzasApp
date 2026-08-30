// Supabase Edge Function: generate-recurring-expenses
//
// Corre todos los días (programada vía pg_cron, ver supabase/cron.sql) y
// revisa, para TODOS los usuarios, qué plantillas de gasto recurrente
// (recurring_expenses) ya deberían haber generado su gasto este mes y
// todavía no lo hicieron. Usa la service role key (disponible automática
// en el entorno de la función, nunca expuesta al navegador) porque
// necesita leer/escribir datos de todos los usuarios, no solo del que
// esté conectado.
//
// Deploy: supabase functions deploy generate-recurring-expenses
// Prueba manual: supabase functions invoke generate-recurring-expenses

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function diasEnMes(anio, mesIndex) {
  return new Date(anio, mesIndex + 1, 0).getDate();
}

Deno.serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mesIndex = hoy.getMonth();
    const diaDeHoy = hoy.getDate();
    const maxDiaDelMes = diasEnMes(anio, mesIndex);
    const monthKey = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
    const fechaHoyISO = hoy.toISOString().slice(0, 10);

    const { data: plantillas, error: fetchError } = await supabaseAdmin
      .from('recurring_expenses')
      .select('id, user_id, category_id, nombre, monto, dia_mes')
      .eq('activo', true);

    if (fetchError) throw fetchError;

    const pendientes = (plantillas ?? []).filter((r) => {
      const diaEfectivo = Math.min(r.dia_mes, maxDiaDelMes);
      return diaDeHoy >= diaEfectivo;
    });

    if (pendientes.length === 0) {
      return new Response(JSON.stringify({ ok: true, generados: 0, revisados: plantillas?.length ?? 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Averigua cuáles de las pendientes YA generaron su gasto este mes,
    // para no duplicar (además del índice único de la base de datos, que
    // es la red de seguridad final).
    const idsPendientes = pendientes.map((r) => r.id);
    const { data: yaGenerados, error: checkError } = await supabaseAdmin
      .from('expenses')
      .select('recurring_expense_id, fecha')
      .in('recurring_expense_id', idsPendientes);

    if (checkError) throw checkError;

    const generadosEsteMes = new Set(
      (yaGenerados ?? [])
        .filter((e) => e.fecha.slice(0, 7) === monthKey)
        .map((e) => e.recurring_expense_id)
    );

    const aInsertar = pendientes
      .filter((r) => !generadosEsteMes.has(r.id))
      .map((r) => ({
        user_id: r.user_id,
        category_id: r.category_id,
        monto: r.monto,
        fecha: fechaHoyISO,
        nota: `Recurrente: ${r.nombre}`,
        recurring_expense_id: r.id,
      }));

    if (aInsertar.length === 0) {
      return new Response(JSON.stringify({ ok: true, generados: 0, revisados: plantillas.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError } = await supabaseAdmin.from('expenses').insert(aInsertar);
    // Si el índice único de la base de datos rechaza algún duplicado (ej:
    // dos ejecuciones del cron se cruzaron), no es un error real — ya
    // existe el gasto, que es justo lo que queríamos evitar duplicar.
    if (insertError && insertError.code !== '23505') throw insertError;

    return new Response(
      JSON.stringify({ ok: true, generados: aInsertar.length, revisados: plantillas.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
