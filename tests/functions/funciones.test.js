import { describe, it, expect, beforeEach, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  usuario: null,
  plantillas: [],
  insertados: [],
  borrados: [],
  archivos: [],
  quitados: [],
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: estado.usuario }, error: estado.usuario ? null : new Error('sin sesion') }),
      admin: {
        deleteUser: async (id) => {
          estado.borrados.push(id);
          return { error: null };
        },
      },
    },
    storage: {
      from: () => ({
        list: async () => ({ data: estado.archivos }),
        remove: async (rutas) => {
          estado.quitados.push(...rutas);
          return { error: null };
        },
      }),
    },
    from: (tabla) => ({
      select: () => ({
        eq: async () => ({ data: estado.plantillas, error: null }),
        in: async () => ({ data: [], error: null }),
      }),
      insert: async (filas) => {
        estado.insertados.push({ tabla, filas });
        return { error: null };
      },
    }),
    rpc: async () => ({ data: [] }),
    from_: null,
  }),
}));
vi.mock('npm:web-push@3.6.7', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));

async function cargarFuncion(carpeta, env = {}) {
  vi.resetModules();
  let manejador;
  globalThis.Deno = {
    serve: (fn) => {
      manejador = fn;
    },
    env: { get: (k) => env[k] },
  };
  await import(/* @vite-ignore */ `../../supabase/functions/${carpeta}/index.ts`);
  return manejador;
}

const pedir = (url, { metodo = 'POST', cabeceras = {}, cuerpo } = {}) =>
  new Request(`https://x.supabase.co/functions/v1/${url}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...cabeceras },
    body: metodo === 'GET' ? undefined : JSON.stringify(cuerpo ?? {}),
  });

beforeEach(() => {
  estado.usuario = null;
  estado.plantillas = [];
  estado.insertados = [];
  estado.borrados = [];
  estado.archivos = [];
  estado.quitados = [];
});

describe('generate-recurring-expenses: solo el cron puede llamarla (A01)', () => {
  const ENV = { CRON_SECRET: 'secreto-largo', SUPABASE_URL: 'u', SUPABASE_SERVICE_ROLE_KEY: 'k' };

  it('sin CRON_SECRET configurado, rechaza todo', async () => {
    const f = await cargarFuncion('generate-recurring-expenses', { SUPABASE_URL: 'u' });
    const r = await f(pedir('generate-recurring-expenses', { cabeceras: { 'x-cron-secret': 'cualquiera' } }));
    expect(r.status).toBe(500);
  });

  it('sin cabecera responde 401 y no escribe nada', async () => {
    estado.plantillas = [{ id: 'p1', user_id: 'u1', category_id: null, nombre: 'Arriendo', monto: 100, dia_mes: 1 }];
    const f = await cargarFuncion('generate-recurring-expenses', ENV);
    const r = await f(pedir('generate-recurring-expenses'));
    expect(r.status).toBe(401);
    expect(estado.insertados).toEqual([]);
  });

  it('con la anon key pero sin secreto responde 401', async () => {
    const f = await cargarFuncion('generate-recurring-expenses', ENV);
    const r = await f(pedir('generate-recurring-expenses', { cabeceras: { Authorization: 'Bearer anon-key' } }));
    expect(r.status).toBe(401);
  });

  it('con secreto equivocado (mismo largo) responde 401', async () => {
    const f = await cargarFuncion('generate-recurring-expenses', ENV);
    const r = await f(pedir('generate-recurring-expenses', { cabeceras: { 'x-cron-secret': 'secreto-largx' } }));
    expect(r.status).toBe(401);
  });

  it('con el secreto correcto genera los gastos pendientes', async () => {
    estado.plantillas = [{ id: 'p1', user_id: 'u1', category_id: 'c1', nombre: 'Arriendo', monto: 100, dia_mes: 1 }];
    const f = await cargarFuncion('generate-recurring-expenses', ENV);
    const r = await f(pedir('generate-recurring-expenses', { cabeceras: { 'x-cron-secret': 'secreto-largo' } }));
    const json = await r.json();
    expect(r.status).toBe(200);
    expect(json.generados).toBe(1);
    expect(estado.insertados[0].filas[0]).toMatchObject({ user_id: 'u1', monto: 100, recurring_expense_id: 'p1' });
  });
});

describe('CORS restringido (A05)', () => {
  const ENV = { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k', GEMINI_API_KEY: 'g' };

  it.each(['scan-receipt', 'ask-assistant', 'delete-account', 'send-push'])(
    '%s acepta el origen de la app y no el de un sitio ajeno',
    async (nombre) => {
      const f = await cargarFuncion(nombre, ENV);
      const ok = await f(pedir(nombre, { metodo: 'OPTIONS', cabeceras: { Origin: 'https://finanzascrack.netlify.app' } }));
      const mal = await f(pedir(nombre, { metodo: 'OPTIONS', cabeceras: { Origin: 'https://sitio-malo.com' } }));
      expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://finanzascrack.netlify.app');
      expect(mal.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
  );

  it('el origen permitido se puede cambiar con ORIGENES_PERMITIDOS', async () => {
    const f = await cargarFuncion('scan-receipt', { ...ENV, ORIGENES_PERMITIDOS: 'https://otra-app.cl' });
    const r = await f(pedir('scan-receipt', { metodo: 'OPTIONS', cabeceras: { Origin: 'https://otra-app.cl' } }));
    const antiguo = await f(pedir('scan-receipt', { metodo: 'OPTIONS', cabeceras: { Origin: 'https://finanzascrack.netlify.app' } }));
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://otra-app.cl');
    expect(antiguo.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('scan-receipt: autenticacion y validacion de entrada (A01, A03)', () => {
  const ENV = { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k', GEMINI_API_KEY: 'g' };

  it('sin sesion responde 401', async () => {
    const f = await cargarFuncion('scan-receipt', ENV);
    const r = await f(pedir('scan-receipt', { cuerpo: { image: 'abc' } }));
    expect(r.status).toBe(401);
  });

  it('sin imagen responde 400', async () => {
    estado.usuario = { id: 'u1' };
    const f = await cargarFuncion('scan-receipt', ENV);
    expect((await f(pedir('scan-receipt', { cuerpo: {} }))).status).toBe(400);
  });

  it('rechaza una imagen demasiado pesada', async () => {
    estado.usuario = { id: 'u1' };
    const f = await cargarFuncion('scan-receipt', ENV);
    const r = await f(pedir('scan-receipt', { cuerpo: { image: 'a'.repeat(6_000_001) } }));
    expect(r.status).toBe(400);
  });

  it('lee la boleta y descarta una categoria que no es del usuario', async () => {
    estado.usuario = { id: 'u1' };
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"monto": 12990, "fecha": "2026-11-05", "comercio": "Copec", "categoria_id": "id-ajeno"}' }] } }],
      }),
    }));
    const f = await cargarFuncion('scan-receipt', ENV);
    const r = await f(pedir('scan-receipt', { cuerpo: { image: 'abc', categorias: [{ id: 'c1', nombre: 'Bencina' }] } }));
    const json = await r.json();
    expect(json.ok).toBe(true);
    expect(json.monto).toBe(12990);
    expect(json.categoriaId).toBeNull();
  });
});

describe('ask-assistant', () => {
  const ENV = { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k', GEMINI_API_KEY: 'g' };

  it('sin sesion responde 401', async () => {
    const f = await cargarFuncion('ask-assistant', ENV);
    expect((await f(pedir('ask-assistant', { cuerpo: { context: {}, messages: [{ role: 'user', content: 'hola' }] } }))).status).toBe(401);
  });

  it('pide contexto y pregunta', async () => {
    estado.usuario = { id: 'u1' };
    const f = await cargarFuncion('ask-assistant', ENV);
    expect((await f(pedir('ask-assistant', { cuerpo: { messages: [] } }))).status).toBe(400);
    expect((await f(pedir('ask-assistant', { cuerpo: { context: {}, messages: [] } }))).status).toBe(400);
  });

  it('rechaza un contexto demasiado grande', async () => {
    estado.usuario = { id: 'u1' };
    const f = await cargarFuncion('ask-assistant', ENV);
    const r = await f(pedir('ask-assistant', { cuerpo: { context: { x: 'a'.repeat(200_001) }, messages: [{ role: 'user', content: 'hola' }] } }));
    expect(r.status).toBe(400);
  });
});

describe('send-push: secretos fuera del codigo (A02)', () => {
  const ENV = { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k', SUPABASE_SERVICE_ROLE_KEY: 's', VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', CRON_SECRET: 'cron-secreto' };

  it('sin claves VAPID configuradas no funciona (no hay valores por defecto)', async () => {
    const f = await cargarFuncion('send-push', { SUPABASE_URL: 'u', CRON_SECRET: 'cron-secreto' });
    const json = await (await f(pedir('send-push', { cabeceras: { 'x-cron-secret': 'cron-secreto' } }))).json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/VAPID/);
  });

  it('con un secreto de cron equivocado cae al camino de usuario y exige sesion', async () => {
    const f = await cargarFuncion('send-push', ENV);
    const r = await f(pedir('send-push', { cabeceras: { 'x-cron-secret': 'intento' }, cuerpo: { force: true } }));
    expect(r.status).toBe(401);
  });

  it('sin CRON_SECRET configurado, un valor vacio no sirve como secreto', async () => {
    const f = await cargarFuncion('send-push', { ...ENV, CRON_SECRET: undefined });
    const r = await f(pedir('send-push', { cabeceras: { 'x-cron-secret': '' }, cuerpo: { force: true } }));
    expect(r.status).toBe(401);
  });

  it('el codigo fuente no trae claves privadas escritas', async () => {
    const fs = await import('node:fs');
    for (const carpeta of ['send-push', 'generate-recurring-expenses', 'scan-receipt', 'ask-assistant', 'delete-account']) {
      const texto = fs.readFileSync(`supabase/functions/${carpeta}/index.ts`, 'utf8');
      expect(texto, carpeta).not.toMatch(/PRIVATE_KEY_POR_DEFECTO|SECRET_POR_DEFECTO/);
      expect(texto, carpeta).not.toMatch(/['"][A-Za-z0-9_-]{40,}['"]/);
    }
  });
});

describe('delete-account: derecho a eliminacion', () => {
  const ENV = { SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'k', SUPABASE_SERVICE_ROLE_KEY: 's' };

  it('sin sesion responde 401 y no borra nada', async () => {
    const f = await cargarFuncion('delete-account', ENV);
    const r = await f(pedir('delete-account', { cuerpo: { confirmar: 'ELIMINAR' } }));
    expect(r.status).toBe(401);
    expect(estado.borrados).toEqual([]);
  });

  it('sin la palabra de confirmacion responde 400', async () => {
    estado.usuario = { id: 'u1' };
    const f = await cargarFuncion('delete-account', ENV);
    const r = await f(pedir('delete-account', { cuerpo: { confirmar: 'si' } }));
    expect(r.status).toBe(400);
    expect(estado.borrados).toEqual([]);
  });

  it('solo acepta POST', async () => {
    const f = await cargarFuncion('delete-account', ENV);
    expect((await f(pedir('delete-account', { metodo: 'GET' }))).status).toBe(405);
  });

  it('borra las fotos y el usuario de quien llama, nunca otro', async () => {
    estado.usuario = { id: 'u1' };
    estado.archivos = [{ name: 'a.jpg' }, { name: 'b.jpg' }];
    const f = await cargarFuncion('delete-account', ENV);
    const r = await f(pedir('delete-account', { cuerpo: { confirmar: 'ELIMINAR', userId: 'otro' } }));
    expect((await r.json()).ok).toBe(true);
    expect(estado.borrados).toEqual(['u1']);
    expect(estado.quitados).toEqual(['u1/a.jpg', 'u1/b.jpg']);
  });
});
