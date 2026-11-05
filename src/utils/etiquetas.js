// Grupos ("agrupar como") ya usados en una lista de gastos/aportes. Con
// `categoryId` solo los de esa categoría. Sirve para sugerirlos en los formularios.
export function etiquetasDe(items, categoryId) {
  return [
    ...new Set(
      items
        .filter((x) => x.etiqueta && (!categoryId || x.category_id === categoryId))
        .map((x) => x.etiqueta)
    ),
  ];
}

// Cambia el nombre de un grupo ("agrupar como") en los gastos o aportes de una categoría.
export function renombrarEtiqueta(items, categoryId, de, a) {
  return items.map((x) => (x.category_id === categoryId && x.etiqueta === de ? { ...x, etiqueta: a } : x));
}
