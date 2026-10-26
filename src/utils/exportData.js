// Arma las hojas del respaldo en Excel. Es una función pura (sin Excel ni
// pantalla): recibe los datos de la app y devuelve [{ nombre, filas }], donde
// cada fila es un objeto con encabezados en español. Los montos van como número.
const suma = (items) => items.reduce((s, x) => s + Number(x.monto), 0);

export function construirHojas({
  expenses = [],
  incomes = [],
  fundings = [],
  transfers = [],
  goals = [],
  contributions = [],
  debts = [],
  recurring = [],
  plans = [],
  categories = [],
  saldoPorCategoria = {},
  fechaRespaldo = '',
}) {
  const nombreCat = (id) => categories.find((c) => c.id === id)?.nombre || (id ? 'Categoría eliminada' : '');
  const nombreMeta = (id) => goals.find((g) => g.id === id)?.nombre || 'Meta eliminada';

  const hojas = [];

  hojas.push({
    nombre: 'Info',
    filas: [
      { Dato: 'Respaldo de Mis Finanzas', Valor: fechaRespaldo },
      { Dato: 'Gastos', Valor: expenses.length },
      { Dato: 'Ingresos', Valor: incomes.length },
      { Dato: 'Aportes a categorías', Valor: fundings.length },
      { Dato: 'Movimientos entre categorías', Valor: transfers.length },
      { Dato: 'Metas de ahorro', Valor: goals.length },
      { Dato: 'Deudas y préstamos', Valor: debts.length },
    ],
  });

  hojas.push({
    nombre: 'Gastos',
    filas: expenses.map((e) => ({
      Fecha: e.fecha,
      Monto: Number(e.monto),
      Categoría: nombreCat(e.category_id),
      'Pagado con plata de': e.funding_category_id ? nombreCat(e.funding_category_id) : '',
      Nota: e.nota || '',
      Grupo: e.etiqueta || '',
      'Tiene foto de boleta': e.receipt_path ? 'Sí' : 'No',
    })),
  });

  const repartidoPorIngreso = {};
  for (const f of fundings) if (f.income_id) repartidoPorIngreso[f.income_id] = (repartidoPorIngreso[f.income_id] || 0) + Number(f.monto);
  hojas.push({
    nombre: 'Ingresos',
    filas: incomes.map((i) => ({
      Fecha: i.fecha,
      Monto: Number(i.monto),
      Nota: i.nota || '',
      Repartido: repartidoPorIngreso[i.id] || 0,
      'Sin repartir': Math.max(0, Number(i.monto) - (repartidoPorIngreso[i.id] || 0)),
    })),
  });

  hojas.push({
    nombre: 'Aportes a categorías',
    filas: fundings.map((f) => ({
      Fecha: f.fecha,
      Categoría: nombreCat(f.category_id),
      Monto: Number(f.monto),
      Origen: f.origen === 'ingreso' ? 'Ingreso repartido' : 'Agregado a mano',
      Grupo: f.etiqueta || '',
      Nota: f.nota || '',
    })),
  });

  hojas.push({
    nombre: 'Movimientos entre cat.',
    filas: transfers.map((t) => ({
      Fecha: t.fecha,
      Desde: nombreCat(t.from_category_id),
      Hacia: nombreCat(t.to_category_id),
      Monto: Number(t.monto),
      Nota: t.nota || '',
    })),
  });

  hojas.push({
    nombre: 'Metas de ahorro',
    filas: goals.map((g) => ({
      Meta: g.nombre,
      Objetivo: Number(g.monto_objetivo),
      Ahorrado: suma(contributions.filter((c) => c.goal_id === g.id)),
      'Fecha objetivo': g.fecha_objetivo || '',
      Estado: g.completed_at ? 'Cerrada' : 'En curso',
      'En qué se gastó': g.used_for || '',
      'Fecha de uso': g.used_at || '',
    })),
  });

  hojas.push({
    nombre: 'Aportes a metas',
    filas: contributions.map((c) => ({
      Fecha: c.fecha,
      Meta: nombreMeta(c.goal_id),
      Monto: Number(c.monto),
      'Salió de': c.source_category_id ? nombreCat(c.source_category_id) : 'Plata de afuera / sin origen',
    })),
  });

  hojas.push({
    nombre: 'Deudas y préstamos',
    filas: debts.map((d) => ({
      Fecha: d.fecha,
      Persona: d.persona,
      Tipo: d.tipo === 'prestado' ? 'Le presté' : 'Le debo',
      Monto: Number(d.monto),
      Estado: d.pagado ? 'Saldada' : 'Pendiente',
      'Fecha de pago': d.fecha_pago || '',
      Nota: d.nota || '',
      'Sale de': d.source_category_id ? nombreCat(d.source_category_id) : '',
      'Entra a': d.destination_category_id ? nombreCat(d.destination_category_id) : '',
    })),
  });

  hojas.push({
    nombre: 'Gastos recurrentes',
    filas: recurring.map((r) => ({
      Nombre: r.nombre,
      Monto: Number(r.monto),
      'Día del mes': r.dia_mes,
      Categoría: nombreCat(r.category_id),
      Activo: r.activo ? 'Sí' : 'No',
    })),
  });

  hojas.push({
    nombre: 'Presupuestos semanales',
    filas: plans.map((p) => ({
      Categoría: nombreCat(p.category_id),
      'Monto por semana': Number(p.monto_semanal),
      Semanas: p.semanas,
      Inicio: p.fecha_inicio,
      'Sobrante va a': p.sobrante_category_id ? nombreCat(p.sobrante_category_id) : '',
      Estado: p.estado,
    })),
  });

  hojas.push({
    nombre: 'Categorías',
    filas: categories.map((c) => ({
      Categoría: c.nombre,
      'Saldo actual': Number(saldoPorCategoria[c.id] || 0),
      Oculta: c.oculta ? 'Sí' : 'No',
      'Es inventario': c.es_inventario ? 'Sí' : 'No',
    })),
  });

  return hojas;
}

// Arma y descarga el archivo .xlsx. La librería de Excel se carga recién acá
// (no pesa en el resto de la app).
export async function descargarExcel(hojas, nombreArchivo) {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  for (const hoja of hojas) {
    const ws = XLSX.utils.json_to_sheet(hoja.filas.length ? hoja.filas : [{ Info: 'Sin datos' }]);
    const encabezados = Object.keys(hoja.filas[0] || { Info: '' });
    ws['!cols'] = encabezados.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    XLSX.utils.book_append_sheet(libro, ws, hoja.nombre.slice(0, 31));
  }
  XLSX.writeFile(libro, nombreArchivo);
}
