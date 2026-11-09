/**
 * Cloudflare Pages Function: aktualisiert den Status eines einzelnen Leads
 * in Supabase (Spalte `status`, siehe supabase/schema.sql). Aufgerufen per
 * fetch() aus dem Status-Dropdown auf /admin/leads. Durch die Lage unter
 * functions/admin/ automatisch per functions/admin/_middleware.ts
 * (Session-Cookie) geschützt.
 *
 * Benötigte Umgebungsvariablen: siehe functions/admin/leads.ts.
 */
import { LEAD_STATUSES } from '../_lib/status';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Grobe UUID-Formprüfung — verhindert offensichtlich falsche IDs, bevor sie an Supabase gehen. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Supabase ist nicht konfiguriert.' }, 503);
  }

  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  if (!isPlainObject(raw)) return json({ error: 'Ungültige Anfrage' }, 400);

  const { id, status } = raw;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return json({ error: 'Ungültige Lead-ID' }, 400);
  }
  if (typeof status !== 'string' || !LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return json({ error: 'Ungültiger Status' }, 400);
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      console.error('Supabase-Status-Update fehlgeschlagen, Status', res.status);
      return json({ error: 'Aktualisierung fehlgeschlagen' }, 502);
    }
  } catch (err) {
    console.error('Supabase-Status-Update-Fehler', err);
    return json({ error: 'Aktualisierung fehlgeschlagen' }, 502);
  }

  return json({ ok: true });
};
