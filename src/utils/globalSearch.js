// Busca en gastos (nota + nombre de categoría), ingresos (nota) y deudas
// (persona + nota) a la vez, y devuelve todo junto ordenado por fecha,
// más reciente primero. Coincidencia simple por texto (sin acentos ni
// mayúsculas), no hace falta nada más sofisticado para un buscador personal.

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // saca tildes
}

export function searchAll({ query, expenses = [], incomes = [], debts = [], categories = [] }) {
  const q = normalizar(query.trim());
  if (!q) return [];

  const categoriaPorId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const resultados = [];

  for (const e of expenses) {
    const cat = e.categories || categoriaPorId[e.category_id];
    const texto = normalizar(`${e.nota || ''} ${cat?.nombre || ''}`);
    if (texto.includes(q)) {
      resultados.push({
        tipo: 'gasto',
        id: e.id,
        fecha: e.fecha,
        monto: Number(e.monto),
        titulo: cat?.nombre || 'Sin categoría',
        subtitulo: e.nota || '',
        raw: e,
      });
    }
  }

  for (const i of incomes) {
    const texto = normalizar(i.nota || '');
    if (texto.includes(q)) {
      resultados.push({
        tipo: 'ingreso',
        id: i.id,
        fecha: i.fecha,
        monto: Number(i.monto),
        titulo: 'Ingreso',
        subtitulo: i.nota || '',
        raw: i,
      });
    }
  }

  for (const d of debts) {
    const texto = normalizar(`${d.persona} ${d.nota || ''}`);
    if (texto.includes(q)) {
      resultados.push({
        tipo: 'deuda',
        id: d.id,
        fecha: d.fecha,
        monto: Number(d.monto),
        titulo: d.persona,
        subtitulo: d.tipo === 'prestado' ? 'Le prestaste' : 'Le debes',
        raw: d,
      });
    }
  }

  return resultados.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
