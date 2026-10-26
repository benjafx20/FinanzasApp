import { describe, it, expect } from 'vitest';
import { normalizarComercio } from './habits';

describe('normalizarComercio', () => {
  it('ignora mayúsculas, tildes, espacios y signos', () => {
    expect(normalizarComercio('Copec')).toBe('copec');
    expect(normalizarComercio('  CÓPEC. ')).toBe('copec');
    expect(normalizarComercio('Líder  Express!')).toBe('lider express');
  });
  it('descarta textos vacíos, de una letra o demasiado largos para ser un comercio', () => {
    expect(normalizarComercio('')).toBe('');
    expect(normalizarComercio(null)).toBe('');
    expect(normalizarComercio('a')).toBe('');
    expect(normalizarComercio('almuerzo con el equipo del proyecto de la universidad')).toBe('');
  });
});
