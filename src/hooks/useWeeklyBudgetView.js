import { useMemo, useState } from 'react';
import { calcularPlan } from '../utils/weeklyPlan';
import { resumenSemanaPasada } from '../utils/weeklySummary';
import { alertar, confirmar } from '../utils/dialogs';

// Todo lo que la pantalla necesita del presupuesto semanal: el plan activo de
// cada categoría, cómo va la semana en curso, y el resumen de la semana que
// cerró el domingo (con su "Entendido").
export function useWeeklyBudgetView({ weeklyPlans, weeklyClosures, expenses, fundings, transfers, stopWeeklyPlan }) {
  const planActivoPorCategoria = useMemo(() => {
    const map = {};
    for (const p of weeklyPlans) if (p.estado === 'activo') map[p.category_id] = p;
    return map;
  }, [weeklyPlans]);

  // Plata que le entra a cada categoría (aportes y traspasos recibidos). Los
  // sobrantes que mueve el cierre automático no cuentan como aporte.
  const aportesParaSemana = useMemo(
    () => [
      ...fundings.map((f) => ({ category_id: f.category_id, fecha: f.fecha, monto: f.monto })),
      ...transfers
        .filter((t) => !(t.nota || '').startsWith('Sobrante semana'))
        .map((t) => ({ category_id: t.to_category_id, fecha: t.fecha, monto: t.monto })),
    ],
    [fundings, transfers]
  );

  const semanaPorCategoria = useMemo(() => {
    const map = {};
    for (const [categoryId, plan] of Object.entries(planActivoPorCategoria)) {
      map[categoryId] = calcularPlan(
        plan,
        weeklyClosures.filter((c) => c.plan_id === plan.id),
        expenses,
        aportesParaSemana
      );
    }
    return map;
  }, [planActivoPorCategoria, weeklyClosures, expenses, aportesParaSemana]);

  // Resumen de la semana que cerró el domingo; se oculta con "Entendido" y
  // vuelve a aparecer solo cuando cierra otra semana.
  const [resumenVisto, setResumenVisto] = useState(() => {
    try {
      return localStorage.getItem('resumen-semana-visto') || '';
    } catch {
      return '';
    }
  });
  const resumenItems = useMemo(
    () => resumenSemanaPasada(weeklyPlans, weeklyClosures),
    [weeklyPlans, weeklyClosures]
  );
  const resumenFin = resumenItems.reduce((m, i) => (i.fin > m ? i.fin : m), '');
  const mostrarResumen = resumenItems.length > 0 && resumenFin > resumenVisto;
  const cerrarResumen = () => {
    try {
      localStorage.setItem('resumen-semana-visto', resumenFin);
    } catch {
      /* sin almacenamiento: se oculta igual hasta recargar */
    }
    setResumenVisto(resumenFin);
  };

  const handleStopWeeklyPlan = async (plan) => {
    if (!(await confirmar('¿Apagar el presupuesto semanal de esta categoría? El saldo no cambia y se deja de mover el sobrante.'))) return;
    try {
      await stopWeeklyPlan(plan.id);
    } catch (err) {
      alertar(err.message);
    }
  };

  return {
    planActivoPorCategoria,
    semanaPorCategoria,
    resumenItems,
    mostrarResumen,
    cerrarResumen,
    handleStopWeeklyPlan,
  };
}
