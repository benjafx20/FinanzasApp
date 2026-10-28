// Reemplazo de alert() y confirm() nativos por ventanas de la propia app.
//   alertar('texto')                  -> avisa; se puede ignorar el resultado
//   if (!(await confirmar('texto'))) return;   -> true si el usuario acepta
// Las dibuja <DialogHost /> (montado una vez en main.jsx). Si por algún motivo
// no está montado, cae a los diálogos nativos para no perder el aviso.
let host = null;

export function registerDialogHost(fn) {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

function abrir(config) {
  return new Promise((resolve) => {
    if (!host) {
      if (config.tipo === 'cubrir') resolve(window.confirm(`${config.mensaje}\n\n¿Continuar igual?`) ? { accion: 'negativo' } : null);
      else if (config.tipo === 'confirm') resolve(window.confirm(config.mensaje));
      else {
        window.alert(config.mensaje);
        resolve();
      }
      return;
    }
    host({ ...config, resolve });
  });
}

// Avisa que una categoría no tiene plata suficiente y deja elegir de dónde sacar lo
// que falta. Devuelve { accion: 'mover', fromCategoryId }, { accion: 'negativo' }
// (seguir igual, quedando en negativo) o null (cancelar).
export function cubrirFaltante({ mensaje, faltante, opciones, titulo = 'No alcanza la plata' }) {
  return abrir({ tipo: 'cubrir', mensaje, faltante, opciones, titulo });
}

export function alertar(mensaje, titulo = 'Aviso') {
  return abrir({ tipo: 'alert', mensaje: String(mensaje), titulo });
}

// Las preguntas que empiezan con "¿Eliminar" o "¿Deshacer" se muestran como
// acción peligrosa (botón rojo).
export function confirmar(mensaje, opciones = {}) {
  const texto = String(mensaje);
  return abrir({
    tipo: 'confirm',
    mensaje: texto,
    titulo: opciones.titulo || 'Confirmar',
    textoConfirmar: opciones.textoConfirmar || 'Sí, continuar',
    peligro: opciones.peligro ?? /^¿(Eliminar|Deshacer)/.test(texto),
  });
}
