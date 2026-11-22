// Avisos cortos abajo de la pantalla, con un botón de acción (por ejemplo "Deshacer").
// Los dibuja <ToastHost /> (montado una vez en main.jsx). Un aviso nuevo reemplaza al anterior.
let host = null;

export function registerToastHost(fn) {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

export function mostrarToast({ mensaje, accion, alAccionar, duracion = 8000 }) {
  if (host) host({ mensaje, accion, alAccionar, duracion, id: Date.now() });
}
