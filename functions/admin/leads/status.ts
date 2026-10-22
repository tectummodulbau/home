/**
 * Cloudflare Pages Function: aktualisiert den Status eines einzelnen Leads
 * in D1 (Spalte `status`, siehe d1/schema.sql). Aufgerufen per
 * fetch() aus dem Status-Dropdown auf /admin/leads. Durch die Lage unter
 * functions/admin/ automatisch per functions/admin/_middleware.ts
 * (Session-Cookie) geschützt.
 *
 * Benötigt das D1-Binding `DB` (siehe wrangler.toml).
 */
import { LEAD_STATUSES } from '../_lib/status';
import { DB_MISSING_MESSAGE, type LeadEnv } from '../_lib/lead-source';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Grobe UUID-Formprüfung — verhindert offensichtlich falsche IDs vor dem Datenbankzugriff. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost: PagesFunction<LeadEnv> = async ({ request, env }) => {
  if (!env.DB) return json({ error: DB_MISSING_MESSAGE }, 503);

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
    const result = await env.DB.prepare('UPDATE leads SET status = ? WHERE id = ?').bind(status, id).run();
    if (!result.meta.changes) return json({ error: 'Lead nicht gefunden' }, 404);
  } catch (err) {
    console.error('D1-Status-Update-Fehler', err);
    return json({ error: 'Aktualisierung fehlgeschlagen' }, 502);
  }

  return json({ ok: true });
};
