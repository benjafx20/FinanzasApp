import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const carpetaSql = path.resolve(__dirname, '../../supabase');

const preparacion = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema extensions;
create schema cron;
create table cron.job (jobname text);
create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.unschedule(a text) returns boolean language sql as $$ select true $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export async function crearBaseDatos() {
  const db = new PGlite();
  await db.exec(preparacion);
  for (const archivo of ['schema.sql', 'EJECUTAR-EN-SUPABASE.sql']) {
    let sql = fs.readFileSync(path.join(carpetaSql, archivo), 'utf8');
    sql = sql.replace(/create extension if not exists pg_cron[^;]*;/gi, '');
    await db.exec(sql);
  }
  return db;
}

export async function crearUsuario(db, correo) {
  const r = await db.query('insert into auth.users (email) values ($1) returning id', [correo]);
  return r.rows[0].id;
}

// Ejecuta una consulta como un usuario de la app (rol authenticated con su id) o como anonimo.
export async function comoUsuario(db, userId, fn) {
  await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
  if (userId) await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export async function intentar(fn) {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
