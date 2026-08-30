import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import './MonthlyTrendChart.css';

function getLastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
    });
  }
  return keys;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="trend-tooltip">
      <span className="trend-tooltip__mes">{label}</span>
      <span className="trend-tooltip__monto">{formatCurrency(payload[0].value)}</span>
    </div>
  );
}

export function MonthlyTrendChart({ expenses }) {
  const months = getLastNMonthKeys(6);
  const data = months.map(({ key, label }) => {
    const total = expenses
      .filter((e) => e.fecha.slice(0, 7) === key)
      .reduce((sum, e) => sum + Number(e.monto), 0);
    return { mes: label.charAt(0).toUpperCase() + label.slice(1), total };
  });

  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return <p className="dashboard__empty">Aún no hay suficientes datos para mostrar tendencia.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EDE7FB" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: '#6E6690' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1EBFF' }} />
          <Bar dataKey="total" fill="#7C5CFC" radius={[8, 8, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
