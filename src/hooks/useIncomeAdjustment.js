import { useState } from 'react';
import { alertar } from '../utils/dialogs';

// Editar un ingreso: si cambia el monto y el ingreso ya estaba repartido en
// categorías, el reparto se ajusta en la misma proporción, pero antes se pide
// confirmar (ver IncomeAdjustModal).
export function useIncomeAdjustment({
  editingIncome,
  setEditingIncome,
  fundings,
  allCategories,
  saldoPorCategoria,
  updateIncome,
  updateFunding,
  refetchFundings,
}) {
  const [incomeAjuste, setIncomeAjuste] = useState(null);
  const [ajustando, setAjustando] = useState(false);

  const handleEditIncomeSubmit = async (values) => {
    const ingreso = editingIncome;
    const montoNuevo = Number(values.monto);
    const montoViejo = Number(ingreso.monto);
    const aportes = fundings.filter((f) => f.income_id === ingreso.id);
    if (aportes.length === 0 || montoNuevo === montoViejo) {
      await updateIncome(ingreso.id, values);
      return;
    }
    const ratio = montoNuevo / montoViejo;
    const totalNuevo = Math.round(aportes.reduce((s, f) => s + Number(f.monto), 0) * ratio);
    let acumulado = 0;
    const cambios = aportes.map((f, i) => {
      const nuevo = i === aportes.length - 1 ? totalNuevo - acumulado : Math.round(Number(f.monto) * ratio);
      acumulado += nuevo;
      return {
        funding: f,
        nuevo,
        categoria: allCategories.find((c) => c.id === f.category_id)?.nombre || 'Categoría',
      };
    });
    if (cambios.some((c) => c.nuevo <= 0)) {
      throw new Error('Con ese monto, alguna categoría del reparto quedaría en cero. Edita el reparto a mano.');
    }
    const delta = {};
    for (const c of cambios) {
      delta[c.funding.category_id] = (delta[c.funding.category_id] || 0) + c.nuevo - Number(c.funding.monto);
    }
    const advertencias = Object.entries(delta)
      .filter(([catId, d]) => (saldoPorCategoria[catId] || 0) + d < 0)
      .map(([catId, d]) => ({
        categoria: allCategories.find((c) => c.id === catId)?.nombre || 'Categoría',
        saldoDespues: (saldoPorCategoria[catId] || 0) + d,
      }));
    setIncomeAjuste({ ingreso, values, montoNuevo, cambios, advertencias });
  };

  const confirmarAjuste = async () => {
    const { ingreso, values, cambios } = incomeAjuste;
    setAjustando(true);
    try {
      await updateIncome(ingreso.id, values);
      for (const c of cambios) {
        await updateFunding(c.funding.id, { monto: c.nuevo });
      }
      setIncomeAjuste(null);
    } catch (err) {
      // Si algo falló a medias, se vuelve el ingreso a como estaba y se recarga.
      try {
        await updateIncome(ingreso.id, { monto: ingreso.monto, fecha: ingreso.fecha, nota: ingreso.nota });
      } catch {
        /* sin conexión: queda para revisar a mano */
      }
      refetchFundings();
      alertar(`${err.message} Se dejó el ingreso como estaba; revisa el reparto.`);
      setIncomeAjuste(null);
    } finally {
      setAjustando(false);
    }
  };

  const volverAEditar = () => {
    setEditingIncome(incomeAjuste.ingreso);
    setIncomeAjuste(null);
  };

  const cancelarAjuste = () => {
    if (!ajustando) setIncomeAjuste(null);
  };

  return { incomeAjuste, ajustando, handleEditIncomeSubmit, confirmarAjuste, volverAEditar, cancelarAjuste };
}
