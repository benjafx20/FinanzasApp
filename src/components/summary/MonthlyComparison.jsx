import { useState } from 'react';
import { Amount } from '../ui/Amount';

// Comparación del mes cerrado con el mes anterior: total (con las compras hechas
// con metas de ahorro) y qué categorías subieron o bajaron.
export function MonthlyComparison({ comparacion, anteriorLabel }) {
  const [verTodas, setVerTodas] = useState(false);
  if (!comparacion?.hayMesAnterior) return null;

  const { cambioPct, totalActual, totalAnterior, comprasActual, comprasAnterior, porCategoria } = comparacion;
  const visibles = verTodas ? porCategoria : porCategoria.slice(0, 5);
  const filaStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 };
  const cambio = (delta) => (delta === 0 ? 'igual' : `${delta > 0 ? '↑ +' : '↓ −'}`);

  return (
    <div className="monthly-summary__comparacion" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <strong style={{ fontSize: 13 }}>
        Comparado con {anteriorLabel}
        {cambioPct !== null && ` (${cambioPct > 0 ? '+' : ''}${cambioPct}%)`}
      </strong>
      <div style={filaStyle}>
        <span>Total gastado</span>
        <span><Amount value={totalActual} /> <small>(antes <Amount value={totalAnterior} />)</small></span>
      </div>
      {(comprasActual > 0 || comprasAnterior > 0) && (
        <div style={filaStyle}>
          <span>Compras con ahorro</span>
          <span><Amount value={comprasActual} /> <small>(antes <Amount value={comprasAnterior} />)</small></span>
        </div>
      )}
      {visibles.map((r) => (
        <div key={r.categoria.id} style={filaStyle}>
          <span>{r.categoria.nombre}</span>
          <span className={r.delta > 0 ? 'monthly-summary__chip--negativo' : ''}>
            {r.delta === 0 ? (
              'igual'
            ) : (
              <>
                {cambio(r.delta)}
                <Amount value={Math.abs(r.delta)} />
              </>
            )}
          </span>
        </div>
      ))}
      {porCategoria.length > 5 && (
        <button type="button" className="monthly-summary__volver" onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? 'Ver menos' : `Ver todas (${porCategoria.length})`}
        </button>
      )}
    </div>
  );
}
