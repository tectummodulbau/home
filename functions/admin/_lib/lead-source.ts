/**
 * Gemeinsamer Zugriff auf die Supabase-Tabelle `leads`.
 *
 * Vorher lag der Fetch samt Datensatz-Typ direkt in functions/admin/leads.ts.
 * Mit der Analyseübersicht gibt es einen zweiten Leser — und damit den
 * üblichen Weg, wie zwei Kopien auseinanderlaufen: eine neue Spalte wird an
 * einer Stelle ergänzt und an der anderen vergessen. Deshalb steht der
 * Zugriff jetzt genau hier.
 *
 * Benötigte Umgebungsvariablen (Cloudflare Pages → Settings → Environment variables):
 *   SUPABASE_URL              — z. B. https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — Service-Role-Key (geheim, nur serverseitig!)
 *
 * Der Service-Role-Key umgeht Row Level Security und darf NIE im
 * Client-Bundle landen — er wird ausschließlich serverseitig verwendet.
 */
import { LEAD_STATUSES, type LeadStatus } from './status';

export interface LeadEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
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

/**
 * Lädt alle Leads, neueste zuerst. Datensätze, die vor der Status-Migration
 * angelegt wurden, haben noch kein `status`-Feld — sie werden hier auf „neu"
 * normalisiert, damit die Aufrufer nicht jeder für sich raten müssen.
 */
export async function fetchLeads(env: LeadEnv): Promise<LeadFetchResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      status: 503,
      message: 'Supabase ist nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen).',
    };
  }

  let leads: LeadRecord[];
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      console.error('Supabase-Abfrage fehlgeschlagen, Status', res.status);
      return { ok: false, status: 502, message: 'Fehler beim Laden der Leads.' };
    }
    leads = await res.json();
  } catch (err) {
    console.error('Supabase-Abfrage-Fehler', err);
    return { ok: false, status: 502, message: 'Fehler beim Laden der Leads.' };
  }

  for (const lead of leads) {
    if (!lead.status || !LEAD_STATUSES.includes(lead.status)) lead.status = 'neu';
  }

  return { ok: true, leads };
}
