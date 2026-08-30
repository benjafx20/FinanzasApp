import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { CategoryIcon } from '../../utils/CategoryIcon';
import './CategoryPieChart.css';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="trend-tooltip">
      <span className="trend-tooltip__mes">{item.nombre}</span>
      <span className="trend-tooltip__monto">{formatCurrency(item.total)}</span>
    </div>
  );
}

export function CategoryPieChart({ expenses, categories, monthKey }) {
  const gastoPorCategoria = {};
  for (const exp of expenses) {
    if (!exp.category_id || exp.fecha.slice(0, 7) !== monthKey) continue;
    gastoPorCategoria[exp.category_id] = (gastoPorCategoria[exp.category_id] || 0) + Number(exp.monto);
  }

  const data = categories
    .map((cat) => ({
      nombre: cat.nombre,
      icono: cat.icono,
      color: cat.color,
      total: gastoPorCategoria[cat.id] || 0,
    }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalGeneral = data.reduce((sum, d) => sum + d.total, 0);

  if (data.length === 0) {
    return <p className="dashboard__empty">Aún no hay gastos este mes para mostrar el reparto.</p>;
  }

  return (
    <div className="category-pie">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="nombre"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="category-pie__legend">
        {data.map((d) => {
          const pct = totalGeneral > 0 ? Math.round((d.total / totalGeneral) * 100) : 0;
          return (
            <li key={d.nombre} className="category-pie__legend-row">
              <span className="category-pie__legend-icon" style={{ background: `${d.color}22`, color: d.color }}>
                <CategoryIcon name={d.icono} size={13} />
              </span>
              <span className="category-pie__legend-nombre">{d.nombre}</span>
              <span className="category-pie__legend-pct">{pct}%</span>
              <span className="category-pie__legend-monto">{formatCurrency(d.total)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
