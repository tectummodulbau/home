/**
 * Zugriff auf die D1-Tabelle `leads` (Schema: d1/schema.sql).
 *
 * Das Binding heißt `DB` und wird in wrangler.toml unter [[d1_databases]]
 * deklariert. Fehlt es (z. B. lokal ohne `--d1`), melden die Aufrufer 503.
 */
import { LEAD_STATUSES, type LeadStatus } from './status';

export interface LeadEnv {
  DB?: D1Database;
}

export interface LeadRecord {
  id: string;
  created_at: string;
  flaeche_vorhanden: string | null;
  vollname: string | null;
  firma: string | null;
  email: string | null;
  telefon: string | null;
  abnehmer_typ: string | null;
  vorhaben: string | null;
  einheitenanzahl: string | null;
  erwerbsmodell: string | null;
  status: LeadStatus | null;
}

export type LeadFetchResult =
  | { ok: true; leads: LeadRecord[] }
  | { ok: false; status: number; message: string };

export const DB_MISSING_MESSAGE = 'Datenbank ist nicht konfiguriert (D1-Binding „DB" fehlt).';

/** Lädt alle Leads, neueste zuerst. */
export async function fetchLeads(env: LeadEnv): Promise<LeadFetchResult> {
  if (!env.DB) return { ok: false, status: 503, message: DB_MISSING_MESSAGE };

  try {
    const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC').all<LeadRecord>();
    for (const lead of results) {
      if (!lead.status || !LEAD_STATUSES.includes(lead.status)) lead.status = 'neu';
    }
    return { ok: true, leads: results };
  } catch (err) {
    console.error('D1-Abfrage-Fehler', err);
    // Bewusst nicht 502: Cloudflare ersetzt 502-Antworten durch eine generische
    // Fehlerseite und die Meldung ginge verloren. Der Bereich ist ohnehin per Login geschützt.
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 500, message: `Fehler beim Laden der Leads: ${detail}` };
  }
}
