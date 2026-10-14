import { Modal } from '../ui/Modal';
import { EditFundingForm } from './EditFundingForm';

// Ventana para editar un aporte. Si el aporte viene de un ingreso, su monto
// no puede pasarse de lo que queda sin repartir de ese ingreso.
export function EditFundingModal({
  funding,
  onClose,
  incomes,
  fundings,
  allCategories,
  saldoPorCategoria,
  etiquetasSugeridas,
  onSubmit,
}) {
  const maxMonto = (() => {
    if (!funding?.income_id) return null;
    const ingreso = incomes.find((i) => i.id === funding.income_id);
    if (!ingreso) return null;
    const otros = fundings
      .filter((x) => x.income_id === funding.income_id && x.id !== funding.id)
      .reduce((s, x) => s + Number(x.monto), 0);
    return Math.max(0, Number(ingreso.monto) - otros);
  })();

  return (
    <Modal open={!!funding} onClose={onClose} title="Editar aporte">
      {funding && (
        <EditFundingForm
          funding={funding}
          categoryName={allCategories.find((c) => c.id === funding.category_id)?.nombre || 'la categoría'}
          saldo={saldoPorCategoria[funding.category_id] || 0}
          etiquetasSugeridas={etiquetasSugeridas}
          maxMonto={maxMonto}
          onSubmit={onSubmit}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}
