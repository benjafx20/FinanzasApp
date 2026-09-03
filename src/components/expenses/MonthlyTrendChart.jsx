import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTheme } from '../../context/ThemeContext';
import './MonthlyTrendChart.css';

// Recharts pinta con SVG y no puede leer variables CSS directamente, así
// que se replican acá los mismos tonos de cada paleta/tema (theme.css) para
// que el gráfico nunca quede desincronizado de la paleta activa.
const CHART_COLORS = {
  morado: {
    light: { grid: '#DCD0F5', tick: '#6E6690', cursor: '#EAE0FC', bar: '#6B3FD9' },
    dark: { grid: '#362A52', tick: '#A79CC9', cursor: '#2C2249', bar: '#9B7DFF' },
  },
  vino: {
    light: { grid: '#E0C4BC', tick: '#7D5E63', cursor: '#F3DCE1', bar: '#7A1F3D' },
    dark: { grid: '#3D2229', tick: '#C2A0A8', cursor: '#3A1B24', bar: '#C2547A' },
  },
  oceano: {
    light: { grid: '#C7E2DF', tick: '#517577', cursor: '#D9F0EE', bar: '#0F6E73' },
    dark: { grid: '#1F3F42', tick: '#93B8B7', cursor: '#163538', bar: '#3FB8BE' },
  },
  carbon: {
    light: { grid: '#D3D8DD', tick: '#5C6B7A', cursor: '#E4E7EB', bar: '#3A4756' },
    dark: { grid: '#2A323C', tick: '#8E99A6', cursor: '#232B33', bar: '#7C93AC' },
  },
};

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
  const { theme, palette } = useTheme();
  const colors = CHART_COLORS[palette]?.[theme] ?? CHART_COLORS.morado.light;
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
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: colors.tick }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: colors.cursor }} />
          <Bar dataKey="total" fill={colors.bar} radius={[8, 8, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
