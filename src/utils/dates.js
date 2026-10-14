// Fechas como texto 'YYYY-MM-DD' en la hora LOCAL del dispositivo.
// Ojo: new Date().toISOString() da la fecha en UTC, y en Chile, pasadas las
// 20:00-21:00, ya es "mañana" en UTC. Por eso se usan estas funciones.
const pad = (n) => String(n).padStart(2, '0');

export function fechaLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const hoyISO = () => fechaLocalISO();
