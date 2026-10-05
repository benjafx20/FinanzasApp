import { supabase } from '../lib/supabaseClient';

// Achica la foto antes de mandarla, pero no tanto: una boleta es larga y
// angosta, así que con un límite bajo el texto queda diminuto y se lee mal
// (a 1200px el ancho real de la boleta quedaba en unos 400px). 2000px en el
// lado largo mantiene el texto legible y la foto sigue pesando menos de 1MB.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

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

// `categorias`: lista { id, nombre } entre la que el modelo elige una sugerida.
// Devuelve { monto, fecha, comercio, categoryId } (cualquiera puede venir
// null si no se pudo leer o decidir con confianza) o lanza un error con un
// mensaje para mostrar.
export async function scanReceipt(file, categorias = []) {
  const base64 = await comprimirImagen(file);

  const { data, error } = await supabase.functions.invoke('scan-receipt', {
    body: {
      image: base64,
      mediaType: 'image/jpeg',
      categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
    },
  });

  if (error) {
    throw new Error('No se pudo leer la boleta. Intenta de nuevo o ingrésalo a mano.');
  }
  if (!data?.ok) {
    throw new Error(data?.error || 'No se pudo leer la boleta.');
  }

  return {
    monto: data.monto,
    fecha: data.fecha,
    comercio: data.comercio ?? null,
    categoryId: data.categoriaId ?? null,
  };
}
