// Supabase devuelve como máximo 1.000 filas por consulta. Para listas que pueden
// crecer más (gastos, ingresos, aportes...), esto las pide por páginas hasta
// traerlas todas. `buildQuery` arma la consulta SIN .range(), y siempre debe
// tener un orden estable (termina con .order('id')) para no repetir ni saltarse filas.
// Devuelve { data, error } igual que una consulta normal.
export const PAGE_SIZE = 1000;

export async function fetchAllPages(buildQuery, pageSize = PAGE_SIZE) {
  const filas = [];
  for (let desde = 0; ; desde += pageSize) {
    const { data, error } = await buildQuery().range(desde, desde + pageSize - 1);
    if (error) return { data: null, error };
    filas.push(...data);
    if (data.length < pageSize) return { data: filas, error: null };
  }
}
