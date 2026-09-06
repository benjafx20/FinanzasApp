import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTheme } from '../../context/ThemeContext';
import './YearComparisonChart.css';

// Mismos grid/tick/cursor que MonthlyTrendChart (duplicados a propósito,
// no importados, para no arriesgar romper ese gráfico ya probado si esto
// cambia). barActual = color de marca de la paleta; barAnterior = un tono
// más apagado (ink-soft) para que se note cuál es cuál sin leer la leyenda.
const CHART_COLORS = {
  morado: {
    light: { grid: '#DCD0F5', tick: '#6E6690', cursor: '#EAE0FC', barActual: '#6B3FD9', barAnterior: '#6E6690' },
    dark: { grid: '#362A52', tick: '#A79CC9', cursor: '#2C2249', barActual: '#9B7DFF', barAnterior: '#A79CC9' },
  },
  vino: {
    light: { grid: '#E0C4BC', tick: '#7D5E63', cursor: '#F3DCE1', barActual: '#7A1F3D', barAnterior: '#7D5E63' },
    dark: { grid: '#3D2229', tick: '#C2A0A8', cursor: '#3A1B24', barActual: '#C2547A', barAnterior: '#C2A0A8' },
  },
  oceano: {
    light: { grid: '#C7E2DF', tick: '#517577', cursor: '#D9F0EE', barActual: '#0F6E73', barAnterior: '#517577' },
    dark: { grid: '#1F3F42', tick: '#93B8B7', cursor: '#163538', barActual: '#3FB8BE', barAnterior: '#93B8B7' },
  },
  carbon: {
    light: { grid: '#D3D8DD', tick: '#5C6B7A', cursor: '#E4E7EB', barActual: '#3A4756', barAnterior: '#5C6B7A' },
    dark: { grid: '#2A323C', tick: '#8E99A6', cursor: '#232B33', barActual: '#7C93AC', barAnterior: '#8E99A6' },
  },
};

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function CustomTooltip({ active, payload, label, añoActual, añoAnterior }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="year-tooltip">
      <span className="year-tooltip__mes">{label}</span>
      {payload.map((p) => (
        <span key={p.dataKey} className="year-tooltip__monto">
          {p.dataKey === 'actual' ? añoActual : añoAnterior}: {formatCurrency(p.value)}
        </span>
      ))}
    </div>
  );
}

export function YearComparisonChart({ expenses }) {
  const { theme, palette } = useTheme();
  const colors = CHART_COLORS[palette]?.[theme] ?? CHART_COLORS.morado.light;

  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const añoAnterior = añoActual - 1;

  const totalesPorMesAño = {};
  for (const e of expenses) {
    const [y, m] = e.fecha.split('-').map(Number);
    if (y !== añoActual && y !== añoAnterior) continue;
    const key = `${y}-${m}`;
    totalesPorMesAño[key] = (totalesPorMesAño[key] || 0) + Number(e.monto);
  }

  // Solo hasta el mes actual (no tiene sentido comparar meses futuros de
  // este año, que obviamente están en $0).
  const mesLimite = hoy.getMonth() + 1;
  const data = MESES_CORTOS.slice(0, mesLimite).map((label, i) => ({
    mes: label,
    actual: totalesPorMesAño[`${añoActual}-${i + 1}`] || 0,
    anterior: totalesPorMesAño[`${añoAnterior}-${i + 1}`] || 0,
  }));

  const hayDatos = data.some((d) => d.actual > 0 || d.anterior > 0);
  if (!hayDatos) {
    return <p className="dashboard__empty">Aún no hay suficientes datos para comparar años.</p>;
  }

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: colors.tick }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip añoActual={String(añoActual)} añoAnterior={String(añoAnterior)} />}
            cursor={{ fill: colors.cursor }}
          />
          <Legend
            formatter={(value) => (value === 'actual' ? añoActual : añoAnterior)}
            wrapperStyle={{ fontSize: 12, color: colors.tick }}
          />
          <Bar dataKey="anterior" fill={colors.barAnterior} radius={[6, 6, 0, 0]} maxBarSize={18} />
          <Bar dataKey="actual" fill={colors.barActual} radius={[6, 6, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
