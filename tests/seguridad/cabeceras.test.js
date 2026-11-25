import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';

const toml = fs.readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const csp = toml.match(/Content-Security-Policy = "(.*)"/)[1];

describe('Cabeceras de seguridad (netlify.toml)', () => {
  it('define todas las cabeceras esperadas', () => {
    for (const nombre of [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ]) {
      expect(toml).toContain(nombre);
    }
  });

  it('la politica de contenido no permite scripts inline ni eval', () => {
    const scripts = csp.match(/script-src ([^;]*)/)[1];
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('el unico script inline de index.html esta autorizado por su hash', () => {
    const inline = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
    expect(inline).toHaveLength(1);
    const hash = 'sha256-' + crypto.createHash('sha256').update(inline[0][1]).digest('base64');
    expect(csp).toContain(`'${hash}'`);
  });
});

describe('Recursos externos permitidos', () => {
  it('las fuentes de Google que usa la app estan permitidas', () => {
    const css = fs.readFileSync(new URL('../../src/styles/theme.css', import.meta.url), 'utf8');
    expect(css).toContain('fonts.googleapis.com');
    expect(csp.match(/style-src ([^;]*)/)[1]).toContain('https://fonts.googleapis.com');
    expect(csp.match(/font-src ([^;]*)/)[1]).toContain('https://fonts.gstatic.com');
  });
});
