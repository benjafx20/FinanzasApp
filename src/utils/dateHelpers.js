export function getCurrentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function isInRange(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export function isInMonth(dateStr, monthKey) {
  return dateStr.slice(0, 7) === monthKey;
}

// Clave de semana ISO: 'YYYY-Www' (ej: '2026-W35'). La semana ISO empieza
// el lunes; se usa el mismo criterio en getWeekRange de arriba.
export function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // domingo = 7, no 0
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getCurrentWeekKey() {
  return getWeekKey(new Date());
}

// Verifica si una fecha ('YYYY-MM-DD') cae dentro de la semana ISO indicada.
export function isInWeekKey(dateStr, weekKey) {
  return getWeekKey(new Date(dateStr + 'T00:00:00')) === weekKey;
}
