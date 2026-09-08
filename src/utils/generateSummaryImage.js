// Genera una tarjeta tipo "story" (formato vertical, para compartir en el
// celular) con el resumen del mes, usando los colores de la paleta y el
// tema que estén activos en ese momento (se leen en vivo desde las
// variables CSS, así que si el usuario tiene "vino" o "carbón" puesto,
// la tarjeta sale en esos mismos colores).

const W = 1080;
const H = 1920;

function leerColor(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function blob(ctx, x, y, r, color, alpha) {
  ctx.beginPath();
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineHeight);
  return lines + 1;
}

export async function generateSummaryImage({ monthLabel, stats, formatCurrency }) {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* sigue igual con la fuente de respaldo */ }
  }

  const primary = leerColor('--color-primary') || '#6B3FD9';
  const primaryDark = leerColor('--color-primary-dark') || '#4B2A9E';
  const mint = leerColor('--color-mint') || '#06D6A0';
  const sun = leerColor('--color-sun') || '#F5B942';
  const coral = leerColor('--color-coral') || '#FF6B6B';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fondo: mismo degradado diagonal que el header de la app.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, primary);
  grad.addColorStop(1, primaryDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Blobs decorativos (look "novedoso", tipo resumen anual de Spotify).
  blob(ctx, W * 0.85, H * 0.12, 260, mint, 0.18);
  blob(ctx, W * 0.1, H * 0.28, 200, sun, 0.16);
  blob(ctx, W * 0.9, H * 0.62, 240, coral, 0.14);
  blob(ctx, W * 0.15, H * 0.85, 300, mint, 0.12);

  // Guilloché sutil (mismas líneas finas del header de la app).
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  for (let i = -H; i < W + H; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';

  // Marca
  ctx.font = '600 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('👛 Mis Finanzas', 72, 140);

  ctx.font = '500 34px "Plus Jakarta Sans", sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(`Resumen de ${monthLabel}`, 72, 190);
  ctx.globalAlpha = 1;

  // Número grande: total gastado.
  ctx.font = '600 64px "Plus Jakarta Sans", sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Gastaste en total', 72, 330);
  ctx.globalAlpha = 1;
  ctx.font = '700 130px "Fraunces", serif';
  ctx.fillText(formatCurrency(stats.totalGastado), 72, 460);

  // Frase de comparación con el mes anterior.
  if (stats.cambioPct !== null) {
    const pct = Math.abs(stats.cambioPct);
    const texto = stats.cambioPct <= 0
      ? `${pct}% menos que el mes anterior 🎉`
      : `${pct}% más que el mes anterior`;
    ctx.font = '500 36px "Plus Jakarta Sans", sans-serif';
    ctx.globalAlpha = 0.9;
    wrapText(ctx, texto, 72, 530, W - 144, 46);
    ctx.globalAlpha = 1;
  }

  // Tarjetas de estadísticas.
  const cards = [];
  if (stats.categoriaTop) cards.push({ label: 'Categoría top', valor: stats.categoriaTop.nombre });
  if (stats.ahorroLogrado > 0) cards.push({ label: 'Ahorraste', valor: formatCurrency(stats.ahorroLogrado) });
  if (stats.totalTeDebenAlCierre > 0) cards.push({ label: 'Te debían', valor: formatCurrency(stats.totalTeDebenAlCierre) });
  if (stats.totalDebesAlCierre > 0) cards.push({ label: 'Debías', valor: formatCurrency(stats.totalDebesAlCierre) });
  cards.push({ label: 'Balance al cierre', valor: formatCurrency(stats.balanceAlCierre) });

  let cardY = 680;
  const cardH = 150;
  const cardGap = 28;
  for (const card of cards) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(72, cardY, W - 144, cardH, 28);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.75;
    ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(card.label, 108, cardY + 56);
    ctx.globalAlpha = 1;
    ctx.font = '700 52px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(card.valor, 108, cardY + 116);

    cardY += cardH + cardGap;
  }

  // Pie de página.
  ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
  ctx.globalAlpha = 0.7;
  ctx.fillText('Hecho con Mis Finanzas', 72, H - 72);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => {
    canvas.toBlob((blobResult) => resolve(blobResult), 'image/png');
  });
}
