// Metadata de las paletas disponibles. `swatch` son 2 colores usados para
// pintar el círculo de previsualización en el selector — no se usan para
// pintar la app en sí (eso lo hace theme.css vía [data-palette]).
export const PALETTES = [
  {
    id: 'morado',
    nombre: 'Morado joya',
    descripcion: 'El clásico de la app, en un morado más profundo',
    swatch: ['#6B3FD9', '#F5B942'],
  },
  {
    id: 'vino',
    nombre: 'Vino y cuero',
    descripcion: 'Burdeos profundo con dorado, estilo billetera fina',
    swatch: ['#7A1F3D', '#D4A62B'],
  },
  {
    id: 'oceano',
    nombre: 'Océano',
    descripcion: 'Verde azulado profundo con coral',
    swatch: ['#0F6E73', '#E8604A'],
  },
  {
    id: 'carbon',
    nombre: 'Carbón nocturno',
    descripcion: 'Grafito casi negro con un acento lima eléctrico',
    swatch: ['#1B2430', '#C6FF3D'],
  },
];

export const DEFAULT_PALETTE = 'carbon';
