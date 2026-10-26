import { useMemo, useState } from 'react';
import { IncomeCard } from './IncomeCard';
import { formatCurrency } from '../../utils/formatCurrency';

// Lista de ingresos con lo que falta repartir en categorías. La plata de un
// ingreso solo cuenta en los saldos cuando se reparte.
export function IncomesSection({ incomes, fundings, onEdit, onDelete, onDistribute }) {
  const [verTodos, setVerTodos] = useState(false);

  const { ordenados, restantes, totalSinRepartir } = useMemo(() => {
    const repartidoPorIngreso = {};
    for (const f of fundings) {
      if (f.income_id) repartidoPorIngreso[f.income_id] = (repartidoPorIngreso[f.income_id] || 0) + Number(f.monto);
    }
    const ordenados = [...incomes].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const restantes = {};
    let total = 0;
    for (const i of ordenados) {
      const r = Math.max(0, Number(i.monto) - (repartidoPorIngreso[i.id] || 0));
      restantes[i.id] = r;
      total += r;
    }
    return { ordenados, restantes, totalSinRepartir: total };
  }, [incomes, fundings]);

  if (incomes.length === 0) return <p className="dashboard__empty">Todavía no registras ingresos.</p>;

  const visibles = verTodos ? ordenados : ordenados.slice(0, 5);

  return (
    <div>
      {totalSinRepartir > 0 && (
        <p className="dashboard__empty">
          Tienes {formatCurrency(totalSinRepartir)} de ingresos sin repartir. Esa plata no está en ningún saldo hasta
          que la repartas en categorías.
        </p>
      )}
      <div className="expense-list">
        {visibles.map((i) => (
          <div key={i.id}>
            <IncomeCard income={i} onEdit={onEdit} onDelete={onDelete} />
            {restantes[i.id] > 0 && (
              <button type="button" className="category-detail__show-more" onClick={() => onDistribute(i)}>
                Sin repartir: {formatCurrency(restantes[i.id])} · Repartir
              </button>
            )}
          </div>
        ))}
      </div>
      {ordenados.length > 5 && (
        <button type="button" className="category-detail__show-more" onClick={() => setVerTodos((v) => !v)}>
          {verTodos ? 'Ver menos' : `Ver todos (${ordenados.length})`}
        </button>
      )}
    </div>
  );
}
