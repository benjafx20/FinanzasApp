import { supabase } from '../lib/supabaseClient';

// Achica la foto antes de mandarla (menos datos = más rápido y más barato
// en la llamada al modelo). 1200px en el lado largo es de sobra para leer
// el monto y la fecha de una boleta.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      resolve(dataUrl.split(',')[1]); // solo el base64, sin el prefijo data:...
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la foto.'));
    };

    img.src = url;
  });
}

// Devuelve { monto, fecha } (cualquiera de los dos puede venir null si no
// se pudo leer con confianza) o lanza un error con un mensaje para mostrar.
export async function scanReceipt(file) {
  const base64 = await comprimirImagen(file);

  const { data, error } = await supabase.functions.invoke('scan-receipt', {
    body: { image: base64, mediaType: 'image/jpeg' },
  });

  if (error) {
    throw new Error('No se pudo leer la boleta. Intenta de nuevo o ingrésalo a mano.');
  }
  if (!data?.ok) {
    throw new Error(data?.error || 'No se pudo leer la boleta.');
  }

  return { monto: data.monto, fecha: data.fecha };
}
